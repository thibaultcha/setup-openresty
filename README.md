# GitHub Actions OpenResty

This action installs OpenResty and useful development tools for lua-resty
workflows.

# Table of Contents

- [Usage](#usage)
- [Examples](#examples)
- [License](#license)

## Usage

```yml
- name: Build OpenResty
  uses: thibaultcha/actions-openresty@main
  with:
    version: 1.19.9.1
```

### Inputs

Name                    |  Type  | Default | Description
-----------------------:|:------:|:-------:|:-----------
`version` (required)    | string |         | OpenResty version (e.g. `1.19.9.1`)
`opt`                   | string |         | Configuration options (`./configure [opt`)
`with-cc`               | string |         | Compiler (`--with-cc`)
`with-cc-opt`           | string | -g      | Compiler options (`--with-cc-opt`)
`with-ld-opt`           | string |         | Linker options (`--with-ld-opt`)
`with-debug`            | bool   | `false` | Enable debug build (`--with-debug`)
`with-no-pool-patch`    | bool   | `false` | Enable no-pool patch (`--with-no-pool-patch`)
`with-openssl-version`  | string |         | OpenSSL version (e.g. `1.1.1l`)
`with-openssl-opt`      | string |         | OpenSSL build options (`--with-openssl-opt`)
`test-nginx`            | bool   | `true`  | Install Test::Nginx CPAN module

### Outputs

Name               | Description
------------------:|:-----------
`OPENRESTY_PREFIX` | Path to the prefix at which OpenResty was installed (`--prefix`)

## Examples

Build OpenResty without TLS support and without the streaming module:

```yml
- name: Build OpenResty
  uses: thibaultcha/actions-openresty@main
  with:
    version: ${{ matrix.openresty }}
    opt: --without-stream
```

Build OpenResty and run Test::Nginx on a lua-resty lib:

```yml
- name: Checkout lua-resty lib
  uses: actions/checkout@v2
  with:
    repository: openresty/lua-resty-lrucache
    path: lua-resty-lib
- name: Build OpenResty
  uses: thibaultcha/actions-openresty@main
  with:
    version: ${{ matrix.openresty }}
    opt: --without-stream
- run: prove -r
  working-directory: lua-resty-lib
```

## License

The scripts and documentation in this project are released under the [MIT
License](LICENSE).
