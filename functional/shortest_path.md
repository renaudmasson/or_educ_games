Objective:
In this game the player is presented with a graph where each arc has a weight, the objective will be to find the shortest path from the source node (left most node on the screen) to the target node (right most node on the screen).

UX:
The user will be able to construct its solution by clicking on the next node to visit, somewhere on the screen the total length of the current path will be shown. When reaching the target node, if the solution is the optimal one a congratulation banner will appear, otherwise nothing will happen.
The user will be able to revert its decision by clicking on a node that is part of the path, then every selected arc coming after that node will get unselected.
To help the user, the weight of the arcs should be vaguelly related to their length.
There should be a solution button, that will execute the Dijkstra algorihm on the instance in a visual way to show to the user how the solution is to be computed.
In the visual representation the nodes should not be too close to each others.
Use a couple of distinct colors for the arcs, the weight of an arc should be written in the same color as the arc to facilitate it for the user to see which weight refers to which arc. No neighboring arcs should be assigned the same color. No arc crossing should be assigned the same color. An arc should not go through a node that is not one of its extremities. Make sure that there is a minimum distance between the labels showing the weights of the arcs.

Instances:
There will be 5 levels, where the graph will be randomly generated.
Level 1: 6 nodes, there should be no path from source to target with less than 2 arcs
Level 2: 8 nodes, there should be no path from source to target with less than 3 arcs
Level 3: 12 nodes, there should be no path from source to target with less than 4 arcs
Level 4: 15 nodes, there should be no path from source to target with less than 5 arcs
Level 5: 20 nodes, there should be no path from source to target with less than 6 arcs

Graph requirements:
The graph should consist in a single component (in the sense that there should be a path between every pair of nodes of the graph).
Each node should have 3 to 5 arcs.
There should be no arc from source to target.
