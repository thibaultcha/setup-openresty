# GitHub Actions - Setup OpenResty

This action installs OpenResty and useful development tools for lua-resty
libraries CI/CD workflows.

# Table of Contents

- [Usage](#usage)
- [Examples](#examples)
- [License](#license)

## Usage

```yml
- name: Setup OpenResty
  uses: thibaultcha/setup-openresty@main
  with:
    version: 1.19.9.1
```

When successful, this action updates `$PATH` to include the `nginx` binary at
`$OPENRESTY_PREFIX/nginx/sbin/nginx` and the `openresty` symlink at
`$OPENRESTY_PREFIX/bin/openresty`.

It also installs the
[Test::Nginx::Socket](https://metacpan.org/pod/Test%3A%3ANginx%3A%3ASocket)
framework via [cpanminus](https://github.com/miyagawa/cpanminus) and updates
`$PERL5LIB` accordingly.

### Inputs

Name                    |  Type  | Default | Description
-----------------------:|:------:|:-------:|:-----------
`version` (required)    | string |         | OpenResty version (e.g. `1.19.9.1`)
`opt`                   | string |         | Configuration options (`./configure [opt...]`)
`cc`                    | string |         | Compiler (`--with-cc`)
`cc-opt`                | string | -g      | Compiler options (`--with-cc-opt`)
`ld-opt`                | string |         | Linker options (`--with-ld-opt`)
`debug`                 | bool   | `false` | Enable debug build (`--with-debug`)
`no-pool-patch`         | bool   | `false` | Enable no-pool patch (`--with-no-pool-patch`)
`openssl-version`       | string |         | OpenSSL version (e.g. `1.1.1l`)
`openssl-opt`           | string |         | OpenSSL build options (`--with-openssl-opt`)
`test-nginx`            | bool   | `true`  | Install Test::Nginx CPAN module

### Outputs

Name               | Description
------------------:|:-----------
`OPENRESTY_PREFIX` | Path to the prefix at which OpenResty was installed (`--prefix`)

[Back to TOC](#table-of-contents)

## Examples

Setup to run Test::Nginx on a lua-resty lib:

```yml
- name: Checkout lua-resty lib
  uses: actions/checkout@v2
  with:
    repository: openresty/lua-resty-lrucache
- name: Setup OpenResty
  uses: thibaultcha/setup-openresty@main
  with:
    version: ${{ matrix.openresty }}
- run: prove -r
  working-directory: lua-resty-lrucache
```

OpenResty with TLS:

```yml
- name: Setup OpenResty
  uses: thibaultcha/setup-openresty@main
  with:
    version: ${{ matrix.openresty }}
    openssl-version: 1.1.1l
```

OpenResty without TLS and without the streaming module:

```yml
- name: Setup OpenResty
  uses: thibaultcha/setup-openresty@main
  with:
    version: ${{ matrix.openresty }}
    opt: --without-http_ssl_module --without-stream
```

[Back to TOC](#table-of-contents)

## License

The scripts and documentation in this project are released under the [MIT
License](LICENSE).

[Back to TOC](#table-of-contents)
