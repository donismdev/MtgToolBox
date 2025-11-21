import subprocess
import sys
import os

def run_npm_start():
    """
    Runs the 'npm start' command in the shell.
    Handles platform-specific command execution.
    """
    command = []
    # On Windows, 'npm' is often a .cmd file, and it's safer to run it through the shell.
    if sys.platform == "win32":
        command = ["npm", "start"]
        print("Running 'npm start' on Windows...")
        # Using shell=True on Windows to correctly find npm.cmd
        try:
            process = subprocess.Popen(command, shell=True)
            process.wait()
        except KeyboardInterrupt:
            print("Stopping 'npm start'...")
            # Send Ctrl+C to the subprocess
            process.send_signal(subprocess.signal.CTRL_C_EVENT)
            process.wait()
        except Exception as e:
            print(f"An error occurred: {e}")
            
    # On other platforms (Linux, macOS)
    else:
        command = ["npm", "start"]
        print("Running 'npm start' on non-Windows OS...")
        try:
            # shell=False is safer on non-Windows platforms
            process = subprocess.Popen(command)
            process.wait()
        except KeyboardInterrupt:
            print("Stopping 'npm start'...")
            process.terminate()
            process.wait()
        except Exception as e:
            print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Get the directory of the script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Change the current working directory to the script's directory
    # This ensures 'npm start' is run in the project root.
    os.chdir(script_dir)
    
    print(f"Changed working directory to: {os.getcwd()}")
    
    run_npm_start()
