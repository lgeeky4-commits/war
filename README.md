# WARFRONT FIVE — fictional multiplayer strategy game

Separate project. Up to five connected browser players; choose RED or BLUE team.

## Features
- Real-world OpenStreetMap basemap (requires internet; not offline)
- Team chat, simulated missile strikes, temporary target markers
- Private voice/video calling and opt-in phone camera sharing (WebRTC)
- Five-player room cap; desktop and mobile layout

## Start
Node.js 18+:
`npm start`
Open http://localhost:3000

## Deploy
Upload the contents of this folder to a GitHub repository. Create a Render Web Service, use `npm start` as Start Command, and deploy. Use the HTTPS URL on phones. Camera/microphone permissions require HTTPS outside localhost.

## Notes
All strikes, aircraft, ranges and attacks are fictional game events. There is no real-world targeting or weapon control.
This is a demo, not a production-secure service. Players and events reset on restart. Calls use WebRTC STUN; some networks require a TURN relay for reliable connectivity.
