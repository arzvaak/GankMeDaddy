const path = require('path');
const { app, desktopCapturer, nativeImage } = require('electron');

app.whenReady().then(async () => {
  const framePath = process.argv[2];
  if (!framePath) throw new Error('Usage: electron scripts/test-visual-frame.js <draft-frame>');
  const { VisualDraftDetector } = require('../dist/electron/visualDraftDetector.js');
  const detector = new VisualDraftDetector(path.resolve(__dirname, '../src/renderer/assets'));
  let frame;
  if (framePath === '--live') {
    const sources = await desktopCapturer.getSources({ types: ['window'], thumbnailSize: { width: 1920, height: 1080 } });
    const dota = sources.find(source => /dota\s*2/i.test(source.name));
    if (!dota) throw new Error('Dota 2 window not found');
    frame = dota.thumbnail;
  } else {
    frame = nativeImage.createFromPath(path.resolve(framePath));
  }
  const result = detector.analyzeImage(frame);
  console.log(`[VISION-FRAME] ${JSON.stringify(result)}`);
  app.exit(result.radiant.length + result.dire.length > 0 ? 0 : 1);
}).catch(error => {
  console.error(`[VISION-FRAME] ${error.stack || error.message}`);
  app.exit(1);
});
