package com.claudeint.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class BridgeService : Service() {

    companion object {
        private const val CHANNEL_ID = "claudeint_bridge"
        private const val NOTIFICATION_ID = 1
    }

    private var bridgeProcess: Process? = null
    private var bootstrapThread: Thread? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification("Initializing..."))
        bootstrapAndStart()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        bridgeProcess?.destroy()
        bootstrapThread?.interrupt()
        super.onDestroy()
    }

    private fun bootstrapAndStart() {
        bootstrapThread = Thread {
            try {
                copyAssetsIfNeeded()
                runBootstrap()
                startBridge()
                updateNotification("Bridge running")
            } catch (e: Exception) {
                e.printStackTrace()
                updateNotification("Error: ${e.message}")
            }
        }.also { it.start() }
    }

    private fun copyAssetsIfNeeded() {
        val bridgeDir = java.io.File(filesDir, "bridge/src")
        if (bridgeDir.exists()) return

        bridgeDir.mkdirs()
        val bridgeFiles = listOf(
            "bridge/package.json",
            "bridge/src/index.js", "bridge/src/session.js",
            "bridge/src/parser.js", "bridge/src/router.js",
            "bridge/src/commands.js", "bridge/src/files.js"
        )
        for (path in bridgeFiles) {
            val dest = java.io.File(filesDir, path)
            dest.parentFile?.mkdirs()
            assets.open("bridge/$path".removePrefix("bridge/")).use { input ->
                dest.outputStream().use { output -> input.copyTo(output) }
            }
        }

        // Install bridge dependencies
        val npmBin = "${filesDir.absolutePath}/usr/bin/npm"
        if (java.io.File(npmBin).exists()) {
            ProcessBuilder(npmBin, "install", "--production")
                .directory(java.io.File(filesDir, "bridge"))
                .redirectErrorStream(true)
                .start().waitFor()
        }
    }

    private fun runBootstrap() {
        val stamp = java.io.File(filesDir, ".bootstrapped")
        val nodeBin = java.io.File(filesDir, "usr/bin/node")
        if (stamp.exists() && nodeBin.exists()) return

        val bootstrapScript = java.io.File(filesDir, "bootstrap.sh")
        assets.open("bootstrap.sh").use { input ->
            bootstrapScript.outputStream().use { output -> input.copyTo(output) }
        }
        bootstrapScript.setExecutable(true)

        val env = arrayOf(
            "CLAUDEINT_PREFIX=${filesDir.absolutePath}",
            "HOME=${filesDir.absolutePath}",
            "PATH=/system/bin:/system/xbin:${filesDir.absolutePath}/usr/bin"
        )
        Runtime.getRuntime().exec(
            arrayOf("/system/bin/sh", bootstrapScript.absolutePath),
            env, filesDir
        ).waitFor()
    }

    private fun startBridge() {
        val nodeBin = "${filesDir.absolutePath}/usr/bin/node"
        val bridgeScript = "${filesDir.absolutePath}/bridge/src/index.js"
        val cwd = filesDir.absolutePath

        try {
            bridgeProcess = ProcessBuilder(nodeBin, bridgeScript)
                .directory(java.io.File(cwd))
                .redirectErrorStream(true)
                .apply {
                    environment()["BRIDGE_PORT"] = "3100"
                    environment()["BRIDGE_CWD"] = cwd
                }
                .start()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "ClaudeInT Bridge",
                NotificationManager.IMPORTANCE_LOW
            )
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(text: String = "Bridge running"): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ClaudeInT")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }

    private fun updateNotification(text: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, buildNotification(text))
    }
}
