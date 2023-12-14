# Successful Orbital Launches per Year and per Country

*Data source: [GCAT: General Catalog of Artificial Space Objects, Jonathan C. McDowell](http://www.planet4589.org/space/gcat/web/launch/index.html)*

* After checking out the project, start by running

  ```shell
  npm install
  ```

  to install all the dependencies.


* `launchlog-parser.ts` contains the parser for the original TSV (Tab-Separated Values) dataset

  Run with
  
  ```shell
  ts-node orbital-launches/launchlog-parser.ts
  ```

  to produce `data/launches.json`

* `animation.ts` contains the animation generator

  Run with

  ```shell
  ts-node orbital-launches/animation.ts
  ```

  to produce `data/animation.mp4`
