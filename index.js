const { readFileSync } = require("fs");
const { WSApp } = require("mcpews");
const { KeepLiveWS } = require("bilibili-live-ws");

async function main(path) {
    const config = JSON.parse(readFileSync(path || `${__dirname}/config.json`));
    const port = config.port || 19134;
    const app = new WSApp(port);
    process.stdout.write(`Waiting for connection......port: ${port}\n`);
    /** @type {(s: string) => void} */
    let sendText = () => {};
    config.watch.forEach((roomConfig) => {
        const watcher = new KeepLiveWS(roomConfig.id);
        const format = roomConfig.format || config.format || "%name%: %msg%";
        watcher.on("open", () => {
            process.stdout.write(`Room ${roomConfig.id} connected.\n`);
        });
        watcher.on("msg", (data) => {
            if (data.cmd === "DANMU_MSG") {
                const name = data.info[2][1];
                const msg = data.info[1];
                const formatted = format.replace(/%name%/g, name).replace(/%msg%/g, msg);
                process.stdout.write(`> ${formatted}\n`);
                sendText(formatted);
            }
        });
    });
    const session = await app.waitForSession();
    await session.enableEncryption();
    process.stdout.write(`Successfully connected.\n`);
    if (config.method === "me") {
        sendText = (s) => {
            session.command(`me ${s}`);
        };
    } else if (config.method === "tell") {
        sendText = (s) => {
            config.target.forEach((n) => {
                session.command(`tell ${n} ${s}`);
            });
        };
    } else if (config.method === "tellraw") {
        sendText = (s) => {
            const rawjson = { rawtext: [{ text: s }] };
            const targets = config.target || ["@a"];
            targets.forEach((n) => {
                session.command(`tellraw ${n} ${JSON.stringify(rawjson)}`);
            });
        };
    } else {
        throw new Error("Unknown send method: " + config.method);
    }
}

main(...process.argv.slice(2)).catch((err) => {
    console.error(err);
    process.exit(1);
});
