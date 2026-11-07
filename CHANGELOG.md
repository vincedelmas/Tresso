# Changelog

## [1.4.0](https://github.com/vincedelmas/Tresso/compare/v1.3.3...v1.4.0) (2026-11-07)


### Features

* add bulk card actions and board filters ([80ab4e9](https://github.com/vincedelmas/Tresso/commit/80ab4e9e36b8342d79cb1ba3ed0f6b91c9f5b754))
* add bulk label removal ([80ab4e9](https://github.com/vincedelmas/Tresso/commit/80ab4e9e36b8342d79cb1ba3ed0f6b91c9f5b754))
* add card selection to card menu ([80ab4e9](https://github.com/vincedelmas/Tresso/commit/80ab4e9e36b8342d79cb1ba3ed0f6b91c9f5b754))
* add GitHub fork filter ([df0d6f6](https://github.com/vincedelmas/Tresso/commit/df0d6f64f77ca34e8b65c26b454613030e445ee6))
* add GitHub repository boards ([aec64dd](https://github.com/vincedelmas/Tresso/commit/aec64dda61029562630e3f54fcac201025853ef4))
* clear board search and simplify repository names ([80ab4e9](https://github.com/vincedelmas/Tresso/commit/80ab4e9e36b8342d79cb1ba3ed0f6b91c9f5b754))
* remove missing repository cards during sync ([80ab4e9](https://github.com/vincedelmas/Tresso/commit/80ab4e9e36b8342d79cb1ba3ed0f6b91c9f5b754))


### Bug Fixes

* clear GitHub tokens from mutation state ([c957a82](https://github.com/vincedelmas/Tresso/commit/c957a827022dcd61e53fbe50e96128b6f24a1994))
* move bulk-selected cards to column top ([80ab4e9](https://github.com/vincedelmas/Tresso/commit/80ab4e9e36b8342d79cb1ba3ed0f6b91c9f5b754))
* use native ESM directory in Vite config ([ec99496](https://github.com/vincedelmas/Tresso/commit/ec9949601b2da2c6856f631fb48b72ce00fb7367))


### Code Refactoring

* clean up board controls and GitHub sync ([aa6d389](https://github.com/vincedelmas/Tresso/commit/aa6d38905edadce1706d2ed510c94525eef6a810))
* clean up GitHub repo integration ([565c7db](https://github.com/vincedelmas/Tresso/commit/565c7db4b3135b7eb308f30851a26454419316f8))

## [1.3.3](https://github.com/vincedelmas/Tresso/compare/v1.3.2...v1.3.3) (2026-11-05)


### Bug Fixes

* **deps:** release updated dependencies and API migrations ([803caa4](https://github.com/vincedelmas/Tresso/commit/803caa461bc0d1f5f9f7bb303910ed5562e87f9b))

## [1.3.2](https://github.com/vincedelmas/Tresso/compare/v1.3.1...v1.3.2) (2026-10-24)


### Bug Fixes

* **ui:** narrow caught errors before reading their message ([8c05b34](https://github.com/vincedelmas/Tresso/commit/8c05b34877f8d59e5571ee2cfebb9aa22cd9a268))


### Performance Improvements

* **docker:** omit type declarations from runtime deps ([01e9934](https://github.com/vincedelmas/Tresso/commit/01e9934ebe0a1cf0a853bbbee9bc507f7d68536f))
* **docker:** reduce runtime image size ([8c05b34](https://github.com/vincedelmas/Tresso/commit/8c05b34877f8d59e5571ee2cfebb9aa22cd9a268))
* **docker:** remove dependency source maps from runtime image ([75a13a9](https://github.com/vincedelmas/Tresso/commit/75a13a9ae7faa502a7f69c18f0e6082bb33a3647))

## [1.3.1](https://github.com/vincedelmas/Tresso/compare/v1.3.0...v1.3.1) (2026-10-23)


### Bug Fixes

* add latest name to docker image ([4da912b](https://github.com/vincedelmas/Tresso/commit/4da912bb11df7f079dff81fbec9ee60129b71aca))

## [1.3.0](https://github.com/vincedelmas/Tresso/compare/v1.2.1...v1.3.0) (2026-10-23)


### Features

* add docker image ([8e5b661](https://github.com/vincedelmas/Tresso/commit/8e5b6613de3100f063aa233298f48b568e89bfd1))

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
