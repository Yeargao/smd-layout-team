"""Optional browser integration test. pip install playwright; playwright install chromium."""
import json, os, subprocess, sys, tempfile, time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen([sys.executable,'-m','http.server','8766','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(.5)
 with sync_playwright() as pw:
  opts={'headless':True,'args':['--no-sandbox']}
  if os.environ.get('CHROMIUM_PATH'): opts['executable_path']=os.environ['CHROMIUM_PATH']
  browser=pw.chromium.launch(**opts); page=browser.new_page(viewport={'width':1400,'height':950},accept_downloads=True); errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  
  if os.environ.get('OFFLINE_BROWSER_TEST'):
   def serve(route):
    from urllib.parse import urlparse
    import mimetypes
    name=urlparse(route.request.url).path.lstrip('/') or 'index.html'; p=root/name
    if p.is_file():route.fulfill(path=str(p),content_type=mimetypes.guess_type(str(p))[0] or 'application/octet-stream')
    else:route.fulfill(status=404,body='not found')
   page.route('http://smd.test/**',serve);page.goto('http://smd.test/')
  else:page.goto('http://127.0.0.1:8766')
  page.locator('[data-node="A"]').wait_for()
  def node(id):return page.locator(f'[data-node="{id}"]')
  def center(id):return node(id).evaluate('(e)=>[Number(e.getAttribute("cx")),Number(e.getAttribute("cy"))]')
  def screen(x,y):return page.locator('#canvas').evaluate('(s,p)=>{const q=s.createSVGPoint();q.x=p[0];q.y=p[1];const r=q.matrixTransform(s.getScreenCTM());return [r.x,r.y]}',[x,y])
  def menu(id,collapsed=False):
   if collapsed: node(id).click(button='right')
   else:
    r=page.locator(f'rect[data-region="{id}"]');x,y=r.evaluate('(e)=>[+e.getAttribute("x")+10,+e.getAttribute("y")]');page.mouse.click(*screen(x,y),button='right')
   page.locator('#toggle').click()
  def save():
   with page.expect_download() as dl:page.locator('#save').click()
   return json.loads(Path(dl.value.path()).read_text())
  a=center('A');b=center('B');d=center('D');x,y=screen(*b);page.mouse.move(x,y);page.mouse.down();page.mouse.move(x+15,y+25,steps=4);page.mouse.up();assert center('B')!=b;edited=center('B');assert center('A')==a and center('D')==d
  menu('R');assert node('B').count()==0 and node('R').count()==1;assert center('A')==a and center('D')==d;menu('R',True);assert center('B')==edited
  # Drag existing manual route handle then verify its point survives save.
  h=page.locator('[data-edge="e1"]').first; hx,hy=h.evaluate('(e)=>[+e.getAttribute("cx"),+e.getAttribute("cy")]');sx,sy=screen(hx,hy);page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx+20,sy-24,steps=4);page.mouse.up();data=save();assert data['layout']['routes']['e1']['manual'];assert data['layout']['routes']['e1']['waypoints']
  # Add a nested region and node, then a directed edge to the new node.
  page.locator('#parent').select_option('R');page.locator('#addRegion').click();page.locator('#parent').select_option('R1');page.locator('#addNode').click();assert node('N1').count()==1
  page.locator('#addEdge').click();node('A').click();node('N1').click();data=save();assert any(e['source']=='A' and e['target']=='N1' for e in data['graph']['edges']);assert next(n for n in data['graph']['nodes'] if n['id']=='N1')['parentId']=='R1'
  # Browser reload restores saved geometry without auto-layout, including collapsed flag.
  menu('R');collapsed=save();page.reload();node('R').wait_for();assert node('N1').count()==0;assert center('A')==a and center('D')==d;restored=save();assert restored==collapsed
  # Load exact JSON (and reject corrupt data without losing existing diagram).
  with tempfile.TemporaryDirectory() as td:
   p=Path(td)/'diagram.json';p.write_text(json.dumps(data));page.locator('#load').set_input_files(str(p));node('N1').wait_for();assert save()==data
   p.write_text('{"version":1}');page.locator('#load').set_input_files(str(p));page.wait_for_function("document.querySelector('#status').textContent.includes('Invalid SMD document')");assert node('N1').count()==1
  assert not errors,errors
  browser.close();print('PASS: Chromium node drag, collapse/expand, manual route, nested region/state, new directed edge, save/reload and invalid load rejection.')
finally:
 server.terminate();server.wait(timeout=5)
