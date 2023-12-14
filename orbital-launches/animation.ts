import { Magick, MagickCore } from 'magickwand.js';
import ffmpeg from '@mmomtchev/ffmpeg';
import { Muxer, VideoEncoder } from '@mmomtchev/ffmpeg/stream';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Launch, countries } from './shared';

ffmpeg.setLogLevel(ffmpeg.AV_LOG_ERROR);
const width = 1280;
const height = 720;
const duration = 45;
const fps = 30;
const pointSize = Math.round(width / 16);

// Eliminate all duplicate from an array
const unique = (v: string | number, i: number, a: (string | number)[]): boolean => a.indexOf(v) === i;

// Read the data, raw list of all launches
const launch: Launch[] = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'data', 'launches.json'), 'utf-8'));

// Get all the years
const years = launch.map((l) => new Date(l.date).getFullYear()).sort().filter(unique);

// Separate per year
const perYear = years.map((y) => ({
  year: y,
  launches: launch.filter((l) => new Date(l.date).getFullYear() === y)
}));

// This is one frame of data
interface Frame {
  year: number;
  launchesPerCountry: Record<string, number>;
};
// Accumulate totals (produce the key frame data)
const keyFrames = perYear.map((yearData) => {
  return yearData.launches.reduce((frame, launch) => {
    frame.launchesPerCountry[launch.country] = (frame.launchesPerCountry[launch.country] ?? 0) + 1;
    return frame;
  }, { year: yearData.year, launchesPerCountry: {} } as Frame);
});

function rads(degrees: number) {
  return degrees / 180 * Math.PI;
}

// Creates an interpolated frame between two frames (two years)
// fraction goes from 0 (frame1) to 1 (frame2), values in between are the interpolated frames
function interpolate(frame1: Frame, frame2: Frame, fraction: number): Frame {
  const intp = (v1: number, v2: number, fraction: number) => (v1 ?? 0) * (1 - fraction) + ((v2 ?? 0) * fraction);

  const countries = Object.keys(frame1.launchesPerCountry).concat(Object.keys(frame2.launchesPerCountry)).filter(unique);
  const launchesPerCountry = countries.reduce((launchesPerCountry, country) => {
    launchesPerCountry[country] = intp(frame1.launchesPerCountry[country], frame2.launchesPerCountry[country], fraction);
    return launchesPerCountry;
  }, {});
  return {
    year: intp(frame1.year, frame2.year, fraction),
    launchesPerCountry
  };
}

// Create intermediary frames by interpolation in order to fill the duration
const multiplyFactor = Math.round(fps * duration / keyFrames.length);
const frames = keyFrames.map((frame, idx) => {
  if (!keyFrames[idx + 1]) return [frame];
  const frames = Array(multiplyFactor).fill(0).map((_, i) => interpolate(frame, keyFrames[idx + 1], i / multiplyFactor));
  return frames;
}).flat();

// Draw the legend
function drawLegend(image: Magick.Image) {
  image.draw([
    new Magick.DrawableFont('sans-serif', MagickCore.NormalStyle, 100, MagickCore.NormalStretch),
    new Magick.DrawablePointSize(pointSize / 6),
    new Magick.DrawableStrokeColor('transparent'),
    new Magick.DrawableFillColor('black'),
    new Magick.DrawableText(width / 20, height / 30,
      'Orbital Launches per Year and per Country; ' +
      'source: GCAT: General Catalog of Artificial Space Objects, Jonathan C. McDowell; ' +
      'code: https://github.com/mmomtchev/data-is-beautiful.git'
    )
  ]);

  // This is the right side text, it is drawn only once
  const labels = [] as string[];
  let line = 2;
  for (const c in Object.keys(countries)) {
    const conf = countries[Object.keys(countries)[c]];
    if (labels.includes(conf.label)) continue;
    labels.push(conf.label);
    image.draw([
      new Magick.DrawableFont('sans-serif', MagickCore.NormalStyle, 800, MagickCore.NormalStretch),
      new Magick.DrawablePointSize(pointSize / 6),
      new Magick.DrawableStrokeColor('transparent'),
      new Magick.DrawableFillColor(conf.color),
      new Magick.DrawableText(width * 0.75, (line++) * height / 30, conf.label)
    ]);
  }
}

// Transform the frame data into an image (ie draw it)
let lastYear: number = NaN;
function drawYear(image: Magick.Image, frame: Frame) {
  const total = Object.keys(frame.launchesPerCountry).reduce((total, country) => total + frame.launchesPerCountry[country], 0);

  // It is more efficient to combine all the draw operations and to execute them in one pass
  const drawList = [] as Magick.DrawableBase[];

  // Start by erasing the upper left quarter (the pie)
  drawList.push(
    new Magick.DrawableStrokeColor('white'),
    new Magick.DrawableFillColor('white'),
    new Magick.DrawablePolygon([
      new Magick.Coordinate(0, height / 20),
      new Magick.Coordinate(width * 0.70, height / 20),
      new Magick.Coordinate(width * 0.70, height / 2),
      new Magick.Coordinate(0, height / 2)
    ])
  );

  // The size of the circle, from 1/24 for 1 launch to 10/24 for 200 launches
  const circleSize = Math.round((((Math.min(total, 200) / 200) * 9) + 1) * height / 24);
  const circleRadius = circleSize / 2;
  const circleCenter: [number, number] = [Math.round(width / 4), Math.round(height / 4)];

  // The bars in the barchart
  const barWidth = (width * 0.9) / frames.length;
  const barHeight = height * 0.4;
  const barOriginX = (width * 0.9 - barWidth) * (frame.year - frames[0].year) / (frames[frames.length - 1].year - frames[0].year) + width * 0.05;
  const barOriginY = height * 0.9;

  // The pie parameters
  let angle = 0;
  let barBottom = barOriginY;
  let slices = [] as {
    color: string;
    n: number;
    angles: [number, number];
    vertex1: [number, number];
    vertex2: [number, number];
    bars: Magick.Coordinate[];
  }[];

  for (const country of Object.keys(frame.launchesPerCountry).sort()) {
    // Compute the pie slices
    const part = frame.launchesPerCountry[country] / total;
    const angleStart = angle;
    const angleEnd = angle + part * 360;
    const conf = Object.keys(countries).find((c) => countries[c].label === country);
    if (!conf || !countries[conf]) throw new Error(`Invalid country ${country}`);
    const coordsStart: [number, number] = [circleCenter[0] + circleRadius * Math.cos(rads(angleStart)), circleCenter[1] + circleRadius * Math.sin(rads(angleStart))];
    const coordsEnd: [number, number] = [circleCenter[0] + circleRadius * Math.cos(rads(angleEnd)), circleCenter[1] + circleRadius * Math.sin(rads(angleEnd))];

    // Compute the bottom bars
    const barSliceHeight = Math.round(barHeight * frame.launchesPerCountry[country] / 200);
    slices.push({
      n: frame.launchesPerCountry[country],
      color: countries[conf].color,
      angles: [angleStart, angleEnd],
      vertex1: coordsStart,
      vertex2: coordsEnd,
      bars: [
        new Magick.Coordinate(barOriginX, barBottom),
        new Magick.Coordinate(barOriginX + barWidth, barBottom),
        new Magick.Coordinate(barOriginX + barWidth, barBottom - barSliceHeight),
        new Magick.Coordinate(barOriginX, barBottom - barSliceHeight),
      ]
    });

    angle = angleEnd;
    barBottom -= barSliceHeight;
  }

  // Queue the draw operations in the right order
  for (const slice of slices.sort((a, b) => (b.n - a.n))) {
    drawList.push(
      new Magick.DrawableStrokeColor(slice.color),
      new Magick.DrawableFillColor(slice.color),
      new Magick.DrawableArc(
        circleCenter[0] - circleRadius, circleCenter[1] - circleRadius,
        circleCenter[0] + circleRadius, circleCenter[1] + circleRadius,
        slice.angles[0], slice.angles[1]
      ),
      new Magick.DrawablePolygon([
        new Magick.Coordinate(...circleCenter),
        new Magick.Coordinate(...slice.vertex1),
        new Magick.Coordinate(...slice.vertex2)
      ]),
      new Magick.DrawablePolygon(slice.bars)
    );
  }

  // The big year on the top
  drawList.push(
    new Magick.DrawableStrokeColor('black'),
    new Magick.DrawableFillColor('black'),
    new Magick.DrawableFont('sans-serif', MagickCore.NormalStyle, 600, MagickCore.NormalStretch),
    new Magick.DrawablePointSize(pointSize),
    new Magick.DrawableText(width / 2 - pointSize, pointSize * 1.25, Math.round(frame.year).toString())
  );

  // The small years on the bottom
  if (Math.round(frame.year) !== lastYear) {
    lastYear = Math.round(frame.year);
    drawList.push(
      new Magick.DrawableStrokeColor('black'),
      new Magick.DrawableFillColor('black'),
      new Magick.DrawableFont('sans-serif', MagickCore.NormalStyle, 200, MagickCore.NormalStretch),
      new Magick.DrawablePointSize(pointSize / 4),
      new Magick.DrawableText(barOriginX, barOriginY + (pointSize * 0.3) * (lastYear % 3 + 1), lastYear.toString())
    );
  }

  image.draw(drawList);
  return image;
}

// Create the output video
const file = path.resolve(__dirname, 'data', 'animation.mp4');
const format = new ffmpeg.PixelFormat('yuv420p');
const timeBase = new ffmpeg.Rational(1, fps);
const videoOutput = new VideoEncoder({
  type: 'Video',
  codec: ffmpeg.AV_CODEC_H265,
  bitRate: 5e6, // 5 MBit
  width,
  height,
  frameRate: new ffmpeg.Rational(fps, 1),
  timeBase,
  pixelFormat: format
});
const output = new Muxer({ outputFile: file, streams: [videoOutput] });

// Create an image using a video frame image format
const image = new Magick.Image(`${width}x${height}`, 'white');
image.magick('yuv');
image.depth(8);
image.samplingFactor('4:2:0');
image.strokeAntiAlias(true);
drawLegend(image);

// The main video encoding loop, produce frames and encode them
let idx = 0;
function write() {
  let frame;
  do {
    drawYear(image, frames[idx]);
    const blob = new Magick.Blob;
    image.write(blob);
    frame = ffmpeg.VideoFrame.create(Buffer.from(blob.data()), format, width, height);
    frame.setTimeBase(timeBase);
    frame.setPts(new ffmpeg.Timestamp(idx, timeBase));
    console.log(`Frame ${idx}`);
    idx++;
  } while (videoOutput.write(frame, 'binary') && idx < frames.length);

  if (idx < frames.length) {
    videoOutput.once('drain', write);
  } else {
    videoOutput.end();
  }
}
videoOutput.pipe(output.video[0]);
write();
