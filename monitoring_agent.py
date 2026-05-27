#!/usr/bin/env python3
"""
Monitoring Agent — собирает системные метрики и отправляет в Service Desk API.
Установка одной командой:
  pip install psutil requests && python3 monitoring_agent.py
"""
import psutil
import requests
import platform
import socket
import time
import os
import json

API_URL = os.environ.get("SD_API_URL", "https://srv1652374.hstgr.cloud/api/monitoring/metrics")
API_KEY = os.environ.get("SD_API_KEY", "sk-servicedesk-monitor-2026")
ORG_ID = int(os.environ.get("SD_ORG_ID", "1"))
TENANT_ID = int(os.environ.get("SD_TENANT_ID", "1"))
INTERVAL = int(os.environ.get("SD_INTERVAL", "60"))
HOST_NAME = os.environ.get("SD_HOST_NAME", socket.gethostname())


def get_cpu():
    return psutil.cpu_percent(interval=1)


def get_ram():
    mem = psutil.virtual_memory()
    return {"used_gb": round(mem.used / (1024**3), 2), "total_gb": round(mem.total / (1024**3), 2), "percent": mem.percent}


def get_disk():
    disks = []
    for part in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(part.mountpoint)
            disks.append({"mount": part.mountpoint, "total_gb": round(usage.total / (1024**3), 2),
                          "used_gb": round(usage.used / (1024**3), 2), "percent": usage.percent})
        except Exception:
            pass
    return disks


def get_network():
    net = psutil.net_io_counters()
    return {"bytes_sent": net.bytes_sent, "bytes_recv": net.bytes_recv,
            "mbits_sent": round(net.bytes_sent * 8 / (1024**2), 2),
            "mbits_recv": round(net.bytes_recv * 8 / (1024**2), 2)}


def get_uptime_hours():
    boot = psutil.boot_time()
    now = time.time()
    return round((now - boot) / 3600, 2)


def get_tcp_connections():
    try:
        return len(psutil.net_connections(kind="inet"))
    except Exception:
        return 0


def get_cpu_temp():
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for name, entries in temps.items():
                for e in entries:
                    if e.current is not None:
                        return round(e.current, 1)
    except Exception:
        pass
    return None


def check_status(name, value, thresholds):
    if value > thresholds.get("critical", 100):
        return "critical"
    if value > thresholds.get("warning", 80):
        return "warning"
    return "ok"


def collect_and_send():
    cpu = get_cpu()
    ram = get_ram()
    disks = get_disk()
    network = get_network()
    uptime = get_uptime_hours()
    tcp_conns = get_tcp_connections()
    cpu_temp = get_cpu_temp()

    metrics = [
        {"name": "cpu_usage", "value": cpu, "unit": "%", "status": check_status("cpu", cpu, {"warning": 80, "critical": 95})},
        {"name": "ram_usage", "value": ram["percent"], "unit": "%", "status": check_status("ram", ram["percent"], {"warning": 85, "critical": 95})},
        {"name": "ram_used", "value": ram["used_gb"], "unit": "GB", "status": "ok"},
        {"name": "ram_total", "value": ram["total_gb"], "unit": "GB", "status": "ok"},
        {"name": "uptime", "value": uptime, "unit": "hours", "status": "ok"},
        {"name": "tcp_connections", "value": tcp_conns, "unit": "count", "status": "ok"},
    ]

    for d in disks:
        metrics.append({"name": f"disk_{d['mount'].replace('/','_').replace('\\','_')}", "value": d["percent"],
                        "unit": "%", "status": check_status("disk", d["percent"], {"warning": 80, "critical": 90})})
        metrics.append({"name": f"disk_used_{d['mount'].replace('/','_').replace('\\','_')}", "value": d["used_gb"], "unit": "GB", "status": "ok"})

    metrics.append({"name": "net_sent_mbps", "value": network["mbits_sent"], "unit": "Mbps", "status": "ok"})
    metrics.append({"name": "net_recv_mbps", "value": network["mbits_recv"], "unit": "Mbps", "status": "ok"})

    if cpu_temp is not None:
        metrics.append({"name": "cpu_temp", "value": cpu_temp, "unit": "C", "status": check_status("temp", cpu_temp, {"warning": 75, "critical": 90})})

    payload = {
        "tenant_id": TENANT_ID,
        "org_id": ORG_ID,
        "host_name": HOST_NAME,
        "host_ip": socket.gethostbyname(socket.gethostname()),
        "metrics": metrics
    }

    try:
        r = requests.post(API_URL, json=payload, headers={"X-API-Key": API_KEY}, timeout=10, verify=False)
        if r.status_code == 200:
            print(f"[OK] Sent {len(metrics)} metrics from {HOST_NAME}")
        else:
            print(f"[ERR] API returned {r.status_code}: {r.text[:200]}")
    except Exception as e:
        print(f"[ERR] Failed to send: {e}")


if __name__ == "__main__":
    print(f"Monitoring Agent started. Host: {HOST_NAME}, Interval: {INTERVAL}s, API: {API_URL}")
    while True:
        try:
            collect_and_send()
        except Exception as e:
            print(f"[ERR] Collection failed: {e}")
        time.sleep(INTERVAL)
