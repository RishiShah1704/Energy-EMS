module.exports = {

    flowFile: 'flows.json',

    adminAuth: {
        type: "credentials",
        sessionExpiryTime: 86400,
        users: [{
            username: "admin",
            password: "$2b$08$jceQErwwFEe.ZxBukivEgucIt7MCcUlfK34KFbwqKaTdQfxiFw00q",
            permissions: "*"
        }]
    },

    credentialSecret: "jetpace-energy-ems-2026",

    flowFilePretty: true,

    userDir: require('path').join(__dirname),

    uiPort: process.env.PORT || 1881,

    diagnostics: {
        enabled: true,
        ui: true,
    },

    runtimeState: {
        enabled: false,
        ui: false,
    },

    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },

    contextStorage: {
        default: { module: 'memory' },
        file: { module: 'localfilesystem', config: { flushInterval: 5 } }
    },

    exportGlobalContextKeys: false,

    editorTheme: {
        projects: {
            enabled: false
        }
    },

    functionExternalModules: true,

}
