#! /usr/bin/env node
const chalk = require('chalk')
const yargs = require("yargs");
const figlet = require('figlet');
const chokidar = require('chokidar');
const fs = require('fs');
const { kill } = require('process');

console.log(
    chalk.yellow(
        figlet.textSync('File System Watcher')
    )
)
//yargs setup
const usage = chalk.keyword('violet')("\nUsage: fsw -d <directory>\n")
const options = yargs
    .usage(usage)
    .option("d", { alias: "directory", describe: "Directory to watch", type: "string", demandOption: false })
    .option("e", { alias: "end", describe: "Use to stop watching", demandOption: false })
    .option("s", { alias: "status", describe: "Know if you're already watching a directory and which is it.", demandOption: false })
    .option("l", { alias: "list", describe: "List the changes recorded so far.", demandOption: false })
    .help(true)
    .version(false)
    .argv;


//useful vars
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const pidPath = require("os").homedir() + "/fsw/fswatcher.pid";
const watchPath = require("os").homedir() + "/fsw/pathToWatch";
var pid = ""
//check arguments

//define the logpath location and erase its content
const logPath = require("os").homedir() + "/fsw/log.txt"

fs.writeFileSync(logPath, "", (err) => {
    if (err)
        console.log(err)
    return;
})


if (argv.e || argv.end) {
    try {
        pid = fs.readFileSync(pidPath);
        kill(pid, "SIGTERM");
        console.log("Stopped watching...")
        fs.rm(pidPath, (err) => {
            if (err) {
                console.log(err)
            }
            return;
        });
        fs.rm(watchPath, (err) => {
            if (err) {
                console.log(err)
            }
            return;
        });
    } catch (exception) {
        console.log("No monitoring process is running");
    }
    return;
}

if (argv.l || argv.list) {
    const txt = fs.readFileSync(logPath);

    if (fs.existsSync(watchPath)) {
        console.log("Currently watched : ")
        console.log(txt.toString())
        console.log("Still watching...")
    }
    else {
        if (txt.toString() == "")
            console.log("The last execution didn't watch anything happen.")
        else {
            console.log("The last execution of fsw watched this changes:")
            console.log(txt.toString())
        }
    }
    process.exit(0);
}

const directory = argv.d || argv.directory

if (fs.existsSync(watchPath)) {
    if (argv.s || argv.status) {
        const path = fs.readFileSync(watchPath);
        console.log("Currently watching", path.toString())
        return;
    }
    else if (directory != null) {
        console.log("There's already an instance of fsw running.\nTo stop it, run fsw -e or fsw --end.")
        console.log("To know which directory is currently being watched, run fsw -s or fsw --status\nFor more information, run fsw --help.");
        process.exit(1);
    }
    else {
        console.log("You have to use a parameter.\nFor more information, run fsw --help.");
        process.exit(1);
    }
}
else {
    if (argv.s || argv.status) {
        console.log("There's no running instance of fsw.")
        return;
    }
}

if (directory == null) {
    console.log("You have to use a parameter.\nFor more information, run fsw --help.");
    process.exit(1);
}

if (directory == "") {
    console.log("You need to enter a directory to watch.\nFor more information, run fsw --help.");
    process.exit(1);
}


//create fsw directory in home in case it isnt already created
if (!fs.existsSync(require("os").homedir() + "/fsw"))
    fs.mkdir(require("os").homedir() + "/fsw", () => console.log("fsw dir created"));



//initialize the watcher
const watcher = chokidar.watch(directory, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    silent: true,
});

//config the watcher for all cases
watcher
    .on('add', path => fs.appendFile(logPath, `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | File ${path} has been added\n`, (err) => {
        if (err)
            console.log(err);
        return;
    }))
    .on('change', path => fs.appendFile(logPath, `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | File ${path} has been changed\n`, (err) => {
        if (err)
            console.log(err);
        return;
    }))
    .on('unlink', path => fs.appendFile(logPath, `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | File ${path} has been removed\n`, (err) => {
        if (err)
            console.log(err);
        return;
    }))
    .on('addDir', path => fs.appendFile(logPath, `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Directory ${path} has been added\n`, (err) => {
        if (err)
            console.log(err);
        return;
    }))
    .on('unlinkDir', path => fs.appendFile(logPath, `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Directory ${path} has been removed\n`, (err) => {
        if (err)
            console.log(err);
        return;
    }));


watcher.on('ready', () => {

});

//daemonize the script
var daemon = require("daemonize2").setup({
    main: "index.js",
    name: "fswatcher",
    pidfile: require("os").userInfo().homedir + "/fsw/fswatcher.pid",
    silent: true,

});
//close the terminal once its finished setting up things
daemon.on('started', () => {
    fs.writeFileSync(watchPath, directory.toString(), () => { });
    console.log(chalk.greenBright("Monitoring", directory, "started succesfully."))
    console.log("To stop monitoring, run \"fsw -e\" or \"fsw --end\" ")
    process.exit(0);
})


daemon.start();

