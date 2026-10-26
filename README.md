# desktop-pet

A draggable desktop pet: a head in a glass jar of water (Electron). Shake the window and the water sloshes, bubbles swirl and the head sways.

- Drag to move, click to trigger a reaction, right-click to quit.
- Run: `npm install && npm start`
- Put two transparent VP9 WebM clips in `assets/`: `idle.webm` (looping/ping-pong) and `react.webm` (starts and ends in the idle pose).
  Make them from any black-background video with:
  `ffmpeg -i in.mp4 -vf "colorkey=0x000000:0.12:0.1,format=yuva420p" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 22 out.webm`
