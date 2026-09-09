# Changelog

## [1.2.1](https://github.com/vincedelmas/Tresso/compare/v1.2.0...v1.2.1) (2026-09-09)


### Bug Fixes

* **auth:** upgrade better-auth to remove issuer requirement ([f1d654f](https://github.com/vincedelmas/Tresso/commit/f1d654fd69992559dd676ced32a8ce0021ed3572))

## [1.2.0](https://github.com/vincedelmas/Tresso/compare/v1.1.0...v1.2.0) (2026-08-29)


### Features

* add create board dialog ([d931d65](https://github.com/vincedelmas/Tresso/commit/d931d65f7cf84a697561607003f5dc7ae22c0201))
* expand board colors and refine columns ([ece70bb](https://github.com/vincedelmas/Tresso/commit/ece70bb53e0782068e4791d118d0ba22edfdca5f))
* migrate interface to base nova ([c545a0c](https://github.com/vincedelmas/Tresso/commit/c545a0cfda4bef663232dee2f1a58097917e09e1))
* refine board editing and kanban ui ([2ec933e](https://github.com/vincedelmas/Tresso/commit/2ec933e9b383e7b07d914e63d35c121741a16ec4))


### Bug Fixes

* constrain kanban column height ([35bfd20](https://github.com/vincedelmas/Tresso/commit/35bfd20b279ad2c947699c97461213296872d1fd))
* enforce mutation ownership and error passthrough ([9387023](https://github.com/vincedelmas/Tresso/commit/938702373378d86386922558824cb7566da98fd1))
* isolate database helpers from client ([e4f63d8](https://github.com/vincedelmas/Tresso/commit/e4f63d8a7a41feac546156b1c4a6768e837cc36e))
* make board ordering transactional ([682d7f4](https://github.com/vincedelmas/Tresso/commit/682d7f4d0b1abcfafedeb33858025f9aab99b214))
* preserve drafts across failed mutations ([8bc5cdf](https://github.com/vincedelmas/Tresso/commit/8bc5cdf79e5b555903d413843221e077eb3d3624))
* restore column scroll on card cancel ([f00fb1e](https://github.com/vincedelmas/Tresso/commit/f00fb1e15960b2cc40950b3f54c7ed6401bd2f13))
* tighten server input validation ([10e64bc](https://github.com/vincedelmas/Tresso/commit/10e64bc6a4db4ac7c246fb37f0dd18ff6a295fa9))


### Code Refactoring

* adopt base ui toast system ([9b09165](https://github.com/vincedelmas/Tresso/commit/9b0916592a8d3227cb577a73aa8949dec35add3c))

## [1.1.0](https://github.com/vincedelmas/Tresso/compare/v1.0.0...v1.1.0) (2026-08-29)


### Features

* add move-to-edge actions for cards ([1265161](https://github.com/vincedelmas/Tresso/commit/1265161611982e06cd0cb0571a583b4bdf8c3db5))


### Bug Fixes

* move cards to top of target cols ([7703921](https://github.com/vincedelmas/Tresso/commit/77039210410799703f897e623d8f0327301ce249))
* update card labels after renaming ([67ae565](https://github.com/vincedelmas/Tresso/commit/67ae56572bf0a977d4ebace0e58ff816b6323bc3))
