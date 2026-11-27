# SMD layout editor assignment

Primary objective: develop and evaluate smart initial placement of hierarchical UML/SysML state machines, especially minimizing edge crossings. Use simple circles and arrows; UML styling, labels and process algebra parsing are outside scope.

Requirements: automatic layout, manual node and edge waypoint dragging, add nodes and directed edges, dotted nested regions, right-click collapse into a normal-sized circle and expand. Collapse must redirect displayed edges without changing the stored endpoints or moving unrelated nodes. Restore internal positions and routes. Save and reload graph and layout without invoking automatic layout. Use stable IDs and a separate graph and layout model. Test and benchmark layout quality.

P01: node layout, crossing minimization, benchmark. P02: hierarchy, edge routing, collapse/expand. P03: editor, persistence and integration. Each human works with their local AI using SYNC/PUB/REV/INT/TEST; canonical main only after verified integration. See docs/interfaces.md and docs/team.md.
