const path = require("path")
const { cpus } = require("os")

const DIR_WORK = path.join(process.env.GITHUB_WORKSPACE, "work")
const NPROC = cpus().length

module.exports.DIR_WORK = DIR_WORK
module.exports.NPROC = NPROC
