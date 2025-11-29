# Room over QUIC (RooQ)
Room over QUIC (RooQ) is a room-oriented pubsub protocol operating over QUIC or WebTransport. It specifies the messages exchanged between a client and a server to establish a room, publish media or data, and manage the session.

## Motivation and scope
Accommodations for 10–20 people such as a cottage, villa, or chalet often lack reliable internet connectivity but do have a local network. When a group gathers in such places for a short presentation or hands‑on session, low‑friction, room‑local sharing becomes essential: not only screen video, but also audio, slides, whiteboard snapshots, input/control events, or other small artifacts.

One option is to run an open‑source conferencing stack (e.g., Jitsi Meet) locally, but these solutions typically require complex setup and ongoing maintenance. For example, Jitsi Meet commonly involves multiple services (Videobridge, Prosody, Jicofo) even before a single room can start. Such architectures optimize for large, internet‑scale deployments and are overkill for small, offline‑first rooms.

By having RooQ operated over local networks, users can share screens and other media/data for presentations or collaborative work without relying on internet access.

Since RooQ is designed for small-scale use cases, cascaded relay servers or other highly scalable topologies are out of scope.

## Architecture
RooQ targets server-centric deployments in which multiple clients connect to a single server. Each room is identified by a `room_id`, which the server uses to scope and differentiate concurrent sessions.

## Protocol sequence
### Session establishment
Protocol messages used during session establishment vary based on whether a client is creating a new room or joining an existing one.
#### Creating a new room
1. **Client Initiation**
The client initiates a connection to the server using WebTransport.
2. **Client Greeting**
The client then initiates a bidirectional stream and sends a greeting message. Upon initiation, the client sends a `CREATE_ROOM` message along with the desired `room_id`.
3. **Server Response**
Upon receiving the `CREATE_ROOM` message, the server checks if the `room_id` is available. If it is, the server creates a new room and responds with a `CREATE_ROOM_OK` message. If the `room_id` is already taken, the server responds with an `CREATE_ROOM_ERROR` message indicating that the room cannot be created.

#### Joining an existing room
1. **Client Initiation**
The client initiates a connection to the server using WebTransport.
2. **Client Greeting**
The client then initiates a bidirectional stream and sends a greeting message. Upon initiation, the client sends a `JOIN_ROOM` message along with the desired `room_id`.
3. **Server Response**
Upon receiving the `JOIN_ROOM` message, the server checks if the `room_id` exists. If it does, the server adds the client to the room and responds with a `JOIN_ROOM_OK` message. If the `room_id` does not exist, the server responds with a `JOIN_ROOM_ERROR` message indicating that the room cannot be joined.

