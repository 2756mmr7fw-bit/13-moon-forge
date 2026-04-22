#!/usr/bin/env python3
"""
Forge Remote Agent
==================
Connects your computer to a 13 Moon Forge remote session so Flint can
see your screen and help fix it in real time.

Requirements:
    pip install websockets mss pyautogui pillow sounddevice numpy

Usage:
    python forge_agent.py

    Or with a session code:
    python forge_agent.py --session ABCD1234

The agent will display (or prompt for) a session code.
Share that code with Flint in your Computer Fix session.
"""

import asyncio
import base64
import json
import platform
import socket
import sys
import threading
import time
import argparse
import io
import traceback

try:
    import websockets
    import mss
    import mss.tools
    from PIL import Image
    import pyautogui
    import numpy as np
except ImportError as e:
    print(f"\n[Forge Agent] Missing dependency: {e}")
    print("\nPlease install requirements:")
    print("    pip install websockets mss pyautogui pillow sounddevice numpy\n")
    sys.exit(1)

try:
    import sounddevice as sd
    AUDIO_AVAILABLE = True
except Exception:
    AUDIO_AVAILABLE = False
    print("[Forge Agent] Audio not available — microphone/speaker disabled.")

# ── Configuration ────────────────────────────────────────────────────────────

SERVER_WS = "wss://13moonforge.ai/api/remote/ws"
FRAME_FPS  = 10          # Target frames per second for screen capture
JPEG_QUALITY = 60        # JPEG compression quality (lower = less bandwidth)
AUDIO_SAMPLE_RATE = 16000
AUDIO_CHUNK = 1024

pyautogui.FAILSAFE = False
pyautogui.PAUSE    = 0.0

# ── Session ──────────────────────────────────────────────────────────────────

def get_system_info():
    with mss.mss() as sct:
        mon = sct.monitors[1]
        w, h = mon["width"], mon["height"]
    return {
        "type": "info",
        "os": platform.system(),
        "os_version": platform.version(),
        "hostname": socket.gethostname(),
        "width": w,
        "height": h,
        "python": platform.python_version(),
        "audio": AUDIO_AVAILABLE,
    }


def capture_frame() -> str:
    """Capture the primary screen and return a base64 JPEG string."""
    with mss.mss() as sct:
        mon = sct.monitors[1]
        shot = sct.grab(mon)
        img = Image.frombytes("RGB", shot.size, shot.bgra, "raw", "BGRX")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=False)
        return base64.b64encode(buf.getvalue()).decode()


def handle_command(msg: dict):
    """Execute a remote control command received from the viewer."""
    try:
        t = msg.get("type", "")

        if t == "mouse_move":
            pyautogui.moveTo(msg["x"], msg["y"], duration=0)

        elif t == "mouse_click":
            btn = msg.get("button", "left")
            pyautogui.click(msg["x"], msg["y"], button=btn)

        elif t == "mouse_scroll":
            dy = msg.get("dy", 0)
            clicks = -int(dy / 120) if abs(dy) >= 120 else (-1 if dy > 0 else 1)
            pyautogui.scroll(clicks)

        elif t == "key":
            key = msg.get("key", "")
            ctrl  = msg.get("ctrl", False)
            shift = msg.get("shift", False)
            alt   = msg.get("alt", False)

            hotkeys = []
            if ctrl:  hotkeys.append("ctrl")
            if shift: hotkeys.append("shift")
            if alt:   hotkeys.append("alt")

            key_map = {
                "Enter": "enter", "Backspace": "backspace", "Tab": "tab",
                "Delete": "delete", "Escape": "escape", "ArrowUp": "up",
                "ArrowDown": "down", "ArrowLeft": "left", "ArrowRight": "right",
                "Home": "home", "End": "end", "PageUp": "pageup",
                "PageDown": "pagedown", " ": "space",
            }
            mapped = key_map.get(key, key.lower() if len(key) == 1 else key)

            if hotkeys:
                pyautogui.hotkey(*hotkeys, mapped)
            else:
                pyautogui.press(mapped)

        elif t == "type":
            pyautogui.typewrite(msg.get("text", ""), interval=0.02)

    except Exception as e:
        print(f"[Forge Agent] Command error: {e}")


# ── Audio ────────────────────────────────────────────────────────────────────

audio_send_queue = asyncio.Queue()

def audio_callback(indata, frames, time_info, status):
    """Called by sounddevice for each audio chunk — puts it on the send queue."""
    if status:
        return
    pcm = (indata[:, 0] * 32767).astype(np.int16)
    b64 = base64.b64encode(pcm.tobytes()).decode()
    try:
        audio_send_queue.put_nowait({"type": "audio", "audio": b64})
    except asyncio.QueueFull:
        pass


audio_output_queue: list = []

def play_received_audio(b64_chunk: str):
    """Decode and play audio received from the viewer (Flint's voice)."""
    if not AUDIO_AVAILABLE:
        return
    try:
        raw = base64.b64decode(b64_chunk)
        pcm = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32767
        sd.play(pcm, AUDIO_SAMPLE_RATE, blocking=False)
    except Exception:
        pass


# ── Main agent loop ──────────────────────────────────────────────────────────

async def run_agent(session_id: str):
    url = f"{SERVER_WS}/{session_id}?role=agent"
    print(f"\n[Forge Agent] Connecting to session {session_id}…")
    print(f"[Forge Agent] URL: {url}\n")

    frame_interval = 1.0 / FRAME_FPS
    audio_stream = None

    while True:
        try:
            async with websockets.connect(url, ping_interval=20, ping_timeout=30) as ws:
                print(f"[Forge Agent] Connected! Session: {session_id}")

                # Send system info
                info = get_system_info()
                await ws.send(json.dumps(info))
                print(f"[Forge Agent] System: {info['os']} · {info['width']}×{info['height']}")

                # Start audio capture if available
                if AUDIO_AVAILABLE:
                    try:
                        audio_stream = sd.InputStream(
                            samplerate=AUDIO_SAMPLE_RATE,
                            channels=1,
                            dtype="float32",
                            blocksize=AUDIO_CHUNK,
                            callback=audio_callback,
                        )
                        audio_stream.start()
                        print("[Forge Agent] Microphone started.")
                    except Exception as e:
                        print(f"[Forge Agent] Mic unavailable: {e}")

                last_frame = 0.0

                async def recv_loop():
                    async for raw in ws:
                        try:
                            msg = json.loads(raw)
                            t = msg.get("type", "")

                            if t == "viewer_connected":
                                print("[Forge Agent] Viewer connected — Flint can now see your screen.")

                            elif t == "viewer_disconnected":
                                print("[Forge Agent] Viewer disconnected.")

                            elif t in ("mouse_move", "mouse_click", "mouse_scroll", "key", "type"):
                                threading.Thread(target=handle_command, args=(msg,), daemon=True).start()

                            elif t == "audio":
                                if msg.get("audio"):
                                    threading.Thread(target=play_received_audio, args=(msg["audio"],), daemon=True).start()

                            elif t == "ping":
                                await ws.send(json.dumps({"type": "pong"}))

                        except json.JSONDecodeError:
                            pass

                async def send_loop():
                    nonlocal last_frame
                    while True:
                        now = time.monotonic()
                        elapsed = now - last_frame

                        # Screen frame
                        if elapsed >= frame_interval:
                            frame_b64 = await asyncio.get_event_loop().run_in_executor(None, capture_frame)
                            await ws.send(json.dumps({"type": "frame", "frame": frame_b64}))
                            last_frame = time.monotonic()

                        # Audio chunk
                        try:
                            while not audio_send_queue.empty():
                                audio_msg = audio_send_queue.get_nowait()
                                await ws.send(json.dumps(audio_msg))
                        except Exception:
                            pass

                        await asyncio.sleep(0.001)

                await asyncio.gather(recv_loop(), send_loop())

        except websockets.ConnectionClosed:
            print("[Forge Agent] Connection closed — reconnecting in 3 seconds…")
        except OSError as e:
            print(f"[Forge Agent] Network error: {e} — retrying in 5 seconds…")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"[Forge Agent] Unexpected error: {e}")
            traceback.print_exc()
        finally:
            if audio_stream:
                try:
                    audio_stream.stop()
                    audio_stream.close()
                except Exception:
                    pass
                audio_stream = None

        await asyncio.sleep(3)


# ── Entry point ──────────────────────────────────────────────────────────────

def show_gui(session_id: str):
    """Show a simple tkinter window with the session code."""
    try:
        import tkinter as tk
        root = tk.Tk()
        root.title("Forge Remote Agent")
        root.geometry("380x200")
        root.configure(bg="#1a1a1a")
        root.resizable(False, False)

        tk.Label(root, text="Forge Remote Agent", font=("Arial", 14, "bold"),
                 bg="#1a1a1a", fg="#e8611a").pack(pady=(20, 5))
        tk.Label(root, text="Your Session Code:", font=("Arial", 10),
                 bg="#1a1a1a", fg="#888").pack()
        tk.Label(root, text=session_id, font=("Courier", 28, "bold"),
                 bg="#1a1a1a", fg="white").pack(pady=5)
        tk.Label(root, text="Enter this code in your Computer Fix session\non 13moonforge.ai",
                 font=("Arial", 9), bg="#1a1a1a", fg="#666", justify="center").pack()

        def on_close():
            root.destroy()
            sys.exit(0)

        root.protocol("WM_DELETE_WINDOW", on_close)

        # Run the asyncio agent in a background thread
        def agent_thread():
            asyncio.run(run_agent(session_id))

        t = threading.Thread(target=agent_thread, daemon=True)
        t.start()
        root.mainloop()

    except ImportError:
        # No tkinter — fall back to console mode
        print(f"\n{'='*44}")
        print(f"  FORGE AGENT  |  Session Code: {session_id}")
        print(f"{'='*44}")
        print(f"  Enter this code on 13moonforge.ai/fix")
        print(f"  Press Ctrl+C to stop.\n")
        asyncio.run(run_agent(session_id))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Forge Remote Agent")
    parser.add_argument("--session", "-s", type=str, default=None,
                        help="Session code (auto-generated if not provided)")
    parser.add_argument("--server", type=str, default=SERVER_WS,
                        help="Override WebSocket server URL")
    parser.add_argument("--fps", type=int, default=FRAME_FPS,
                        help="Screen capture frames per second (default: 10)")
    parser.add_argument("--quality", type=int, default=JPEG_QUALITY,
                        help="JPEG quality 1-95 (default: 60)")
    parser.add_argument("--no-gui", action="store_true",
                        help="Run in console mode without a GUI window")
    args = parser.parse_args()

    SERVER_WS    = args.server
    FRAME_FPS    = args.fps
    JPEG_QUALITY = args.quality

    if args.session:
        session_id = args.session.upper()
    else:
        # Generate a random session ID
        import secrets
        session_id = secrets.token_hex(4).upper()

    if args.no_gui:
        print(f"\n{'='*44}")
        print(f"  FORGE AGENT  |  Session Code: {session_id}")
        print(f"{'='*44}")
        print(f"  Enter this code on 13moonforge.ai/fix")
        print(f"  Press Ctrl+C to stop.\n")
        asyncio.run(run_agent(session_id))
    else:
        show_gui(session_id)
