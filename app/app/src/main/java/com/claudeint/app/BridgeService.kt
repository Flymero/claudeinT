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

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
        startBridge()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        bridgeProcess?.destroy()
        super.onDestroy()
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

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ClaudeInT")
            .setContentText("Bridge running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .build()
    }
}
