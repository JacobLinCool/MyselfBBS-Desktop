import fs from "node:fs";

export class Logger {
    private _out_stream: fs.WriteStream;
    private _err_stream: fs.WriteStream;

    constructor(public stdout: string, public stderr: string, public console = true) {
        this._out_stream = fs.createWriteStream(stdout, { flags: "a" });
        this._err_stream = fs.createWriteStream(stderr, { flags: "a" });
    }

    public log(...args: unknown[]) {
        this._out_stream.write(`${new Date().toISOString()} ${args.join(" ")}\n`);

        if (this.console) {
            console.log(...args);
        }

        return this;
    }

    public err(...args: unknown[]) {
        this._err_stream.write(`${new Date().toISOString()} ${args.join(" ")}\n`);

        if (this.console) {
            console.error(...args);
        }

        return this;
    }

    public close() {
        this._out_stream.close();
        this._err_stream.close();
    }
}
