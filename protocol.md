# LS-WT protocol
LS-WT protocol is a protocol for local screen sharing over WebTransport. It defines the sequence of messages exchanged between the client and server to establish a connection, share screen data, and manage the session.

## Motivation and scope
Accomodations for 10-20 people such as cottage, villa or chalet often lack proper internet connectivity but have a local network. When you and your friend group gathers in such places and try to have a little presentation or hand-on session, sharing screens over the local network becomes essential.

One of the existing solutions for this use case is to host an open-source conference system like Jitsi Meet locally, but they often require complex setup and maintenance. For example, Jitsi Meet requires at least three servers (Videobridge, Prosody and Jicofo servers) to start a conference. This type of complex architectures are there for scalability reasons, but are overkill for small-scale use cases such as local screen sharing.

By having LS-WT protocol operated over local networks, users can share their screens for presentations or collaborative work without relying on internet access. 

Since LS-WT protocol is designed for small-scale use cases, cascaded relay servers or other highly scalable topologies are out of the scope.

## Architecture
This protocol is meant to be operated over a server-centric architecture, where multiple clients can connect to a single server to share their screens. Each session has its own unique identifier called `room_id`, which is used to manage and differentiate between multiple sessions.

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

### Sending screen data to the server
Once a client has successfully created or joined a room, they can start sharing their screen.
1. **Start Sharing**
The client sends a `START_SHARING` message to the server to indicate that they are beginning screen sharing.
2. **Server Acknowledgment**
If the `START_SHARING` message is sent from a client that the server has previously sent `JOIN_ROOM_OK` or `CREATE_ROOM_OK` to, the server acknowledges the request by sending a `START_SHARING_OK` message along with a `share_id` back to the client. If not, the server closes the session with `PROTOCOL_ERROR` message. With a `share_id` assigned, the client can now begin transmitting screen data.
3. **Data Transmission**
The client transmits screen data to the server using unidirectional streams. Each unidirectional stream starts with a `STREAM_HEADER` message that includes the `share_id` and metadata about the screen data (e.g., resolution, frame rate). Following the header, the client sends the actual screen data in chunks.

Note that it is up to the client to decide how to map screen data to unidirectional streams. For example, a client may choose to use a single unidirectional stream for all screen data or create a single unidirectional stream per frame. It is also up to the client when to close the streams. LS-WT does not define a session-closing control message because it will have no application-specific information to transmit. The server must manage a mapping between `share_id`s and unidirectional streams to correctly associate incoming screen data with the appropriate sharing session.

### Stopping screen sharing

1. **Stop Sharing**
When a client wants to stop sharing their screen, they send a `STOP_SHARING` message to the server along with the `share_id`. 
2. **Server Acknowledgment**
The server acknowledges this request by sending a `STOP_SHARING_OK` message back to the client. After this, the client can close the unidirectional streams associated with the `share_id`.
