module.exports = {
    apps: [{
        name: "detective-bot",
        script: "./src/index.js",
        watch: false,
        env: {
            NODE_ENV: "production",
        },
        log_date_format: "YYYY-MM-DD HH:mm:ss",
        error_file: "./logs/err.log",
        out_file: "./logs/out.log",
        merge_logs: true,
    }]
}
