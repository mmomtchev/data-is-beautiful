# r/dataisbeautiful

This is a (future) collection of my posts in r/dataisbeautiful

It is meant both as a tutorial for creating visualizations in JavaScript (and TypeScript) and as a demo for two of my major npm packages:

* [node-ffmpeg](https://github.com/mmomtchev/node-ffmpeg) - a complete integration of the ffmpeg audio and video streaming framework with Node.js using `nobind17` (of which I am the author)
* [magickwand.js](https://github.com/mmomtchev/magickwand.js) - Full ImageMagick-7 bindings for Node.js - meant both as a full-featured general-purpose image processing library for Node.js and browser JavaScript and as testing grounds for SWIG Node-API (of which I am the author), includes a tutorial for porting C++ libraries to Node.js

They are very-well suited for scientific visualizations and offer a rare high-level language alternative to the currently existing Python-based tools.

Both of these libraries do all the heavy lifting using fully multi-threaded high-performance C++/ASM SIMD code, while offering a very easy-to-use high-level JavaScript and TypeScript API.

Currently there is only one visualization:

* [Successful Orbital Launches per Year and per Country](https://github.com/mmomtchev/data-is-beautiful/tree/main/orbital-launches)

![Imgur](https://i.imgur.com/WiQrygD.gif)

# License

Copyright 2023 Momtchil Momtchev <momtchil@momtchev.com>

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
