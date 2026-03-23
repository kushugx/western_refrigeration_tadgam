import argparse
import asyncio
import sys
import warnings
from typing import List

from bleak import BleakScanner, BleakError
from open_gopro import WirelessGoPro
from open_gopro.domain.exceptions import ConnectFailed, FailedToFindDevice

# Suppress noisy warnings
warnings.filterwarnings("ignore")


async def prescan(timeout: int) -> List[str]:
    """Perform a quick BLE scan and return formatted device strings."""
    try:
        devices = await BleakScanner.discover(timeout=timeout)
    except BleakError as e:
        raise RuntimeError(f"Bluetooth error: {e}") from e

    found = []
    for d in devices:
        name = d.name or "(unknown)"
        found.append(f"{name} [{d.address}]")
    return found


async def main(timeout: int = 30, retries: int = 3, prescan_timeout: int = 5):
    print("🔍 Connecting to GoPro via BLE (WiFi disabled)...")
    print(f"⏱️ scan timeout={timeout}s, retries={retries}, prescan={prescan_timeout}s")

    # Quick prescan to confirm GoPro is nearby
    try:
        devices = await prescan(prescan_timeout)
        if devices:
            print("📶 Nearby BLE devices:")
            for d in devices:
                print(f"   - {d}")
        else:
            print("⚠️ No BLE devices found during prescan.")
    except RuntimeError as e:
        print(f"❌ {e}")
        print("Please ensure Bluetooth is enabled and grant Bluetooth permission")
        print("to Python in System Settings → Privacy & Security → Bluetooth.")
        return

    gopro = WirelessGoPro(wifi=False, ble=True)

    try:
        try:
            await gopro.open(timeout=timeout, retries=retries)
        except TypeError:
            await gopro.open()

        print("✅ BLE connected to GoPro — WiFi AP should now be enabled")
        print("👉 Now connect your Mac to the GoPro WiFi AP")
        print("Press 'q' then Enter or Ctrl+C to exit cleanly...")
        try:
            while True:
                user_input = await asyncio.to_thread(input)
                if user_input.strip().lower() == "q":
                    print("👋 Exiting on user request...")
                    break
        except (KeyboardInterrupt, EOFError):
            pass

    except FailedToFindDevice:
        print("❌ Failed to find a GoPro device during BLE scan (timed out).")
        print("Tips:")
        print("  - Make sure the GoPro is powered on and nearby")
        print("  - Ensure the camera is advertising BLE")
        print("  - Grant Bluetooth permission to Python in System Settings")

    except BleakError as e:
        print(f"❌ BLE backend error: {e}")

    except ConnectFailed as e:
        print(f"❌ Connection failed: {e}")

    except (KeyboardInterrupt, asyncio.CancelledError):
        pass

    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {e}")

    finally:
        print("\n🔌 Closing GoPro connection...")
        try:
            await gopro.close()
        except Exception:
            pass
        print("👋 Disconnected cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Connect to GoPro via BLE to enable WiFi AP.")
    parser.add_argument("--timeout", type=int, default=30, help="BLE connection timeout in seconds")
    parser.add_argument("--retries", type=int, default=3, help="number of open() retries")
    parser.add_argument("--prescan-timeout", type=int, default=5, help="quick prescan duration in seconds")
    args = parser.parse_args()

    try:
        asyncio.run(main(timeout=args.timeout, retries=args.retries, prescan_timeout=args.prescan_timeout))
    except (KeyboardInterrupt, SystemExit):
        print("\n👋 Exiting cleanly.")
    except Exception:
        print("\n👋 Exiting.")
    finally:
        sys.exit(0)
