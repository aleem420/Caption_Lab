import sys
import ctypes
import atexit
import logging
from typing import Optional

logger = logging.getLogger("captionlab.mutex")

ERROR_ALREADY_EXISTS = 183

class WindowsNamedMutex:
    """
    Guarantees single-instance ownership of the CaptionLab engine daemon on Windows
    using the native Windows CreateMutex API.
    """
    def __init__(self, name: str = "Local\\CaptionLabEngineMutex"):
        self.name = name
        self.handle = None
        self.is_owner = False

    def acquire(self) -> bool:
        """
        Attempts to acquire the named mutex.
        Returns True if acquired as the single owner.
        Returns False if another instance already holds the mutex.
        """
        if sys.platform != "win32":
            # On non-Windows platforms (e.g. CI/Linux), consider acquired
            self.is_owner = True
            return True

        try:
            kernel32 = ctypes.windll.kernel32
            # CreateMutexW(lpMutexAttributes, bInitialOwner, lpName)
            self.handle = kernel32.CreateMutexW(None, True, self.name)
            last_error = kernel32.GetLastError()
            
            if last_error == ERROR_ALREADY_EXISTS:
                self.is_owner = False
                kernel32.CloseHandle(self.handle)
                self.handle = None
                logger.warning(f"Engine mutex '{self.name}' already held by an existing instance.")
                return False

            self.is_owner = True
            atexit.register(self.release)
            logger.info(f"Acquired single-instance mutex '{self.name}'.")
            return True
        except Exception as e:
            logger.error(f"Error acquiring Windows mutex '{self.name}': {e}")
            # Do not block execution on unexpected ctypes error
            self.is_owner = True
            return True

    def release(self):
        """
        Releases the mutex handle.
        """
        if sys.platform == "win32" and self.handle and self.is_owner:
            try:
                kernel32 = ctypes.windll.kernel32
                kernel32.ReleaseMutex(self.handle)
                kernel32.CloseHandle(self.handle)
                logger.info(f"Released single-instance mutex '{self.name}'.")
            except Exception as e:
                logger.error(f"Error releasing mutex '{self.name}': {e}")
            finally:
                self.handle = None
                self.is_owner = False

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()
