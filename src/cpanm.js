const path = require("path")
const io = require("@actions/io")
const { sh, download } = require("./tools")
const { DIR_WORK } = require("./constants")

const DIR_CPAN = path.join(DIR_WORK, "lib", "cpanm")
const CPANM_HOST="https://cpanmin.us"

async function setup_cpanm() {
    await io.mkdirP(DIR_CPAN)

    let cpanm_src = await download("cpanm", CPANM_HOST, "0.0.0")
    await sh(`chmod +x ${cpanm_src}`)

    await sh(`${cpanm_src} --notest --local-lib=${DIR_CPAN} local::lib`)
    await sh(`${cpanm_src} --notest --local-lib=${DIR_CPAN} Test::Nginx`)
    await sh(`${cpanm_src} --notest --local-lib=${DIR_CPAN} IPC::Run`)
    await sh(`${cpanm_src} --notest --local-lib=${DIR_CPAN} IPC::Run3`)

    return DIR_CPAN
}

module.exports.setup = setup_cpanm
