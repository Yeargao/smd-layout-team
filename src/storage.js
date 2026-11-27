export function serialize(doc){return JSON.stringify(doc,null,2);}
export function deserialize(text){const d=JSON.parse(text);if(d.version!==1||!Array.isArray(d.graph?.nodes)||!Array.isArray(d.graph?.edges)||!Array.isArray(d.graph?.regions)||!d.layout?.positions||!d.layout?.regions||!d.layout?.routes)throw new Error('Invalid SMD document');return d;}
