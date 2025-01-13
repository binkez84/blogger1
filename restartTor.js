const { exec } = require("child_process");

const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${command}\n${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(`Warning: ${stderr}`);
      }
      console.log(`Output:\n${stdout}`);
      resolve(stdout);
    });
  });
};

const restartTor = async () => {
  try {
    console.log("Reloading systemd units...");
    await runCommand("sudo systemctl daemon-reload");
    console.log("Systemd units reloaded.");

    console.log("Restarting Tor service...");
    await runCommand("sudo systemctl restart tor");
    console.log("Tor service restarted successfully.");
  } catch (error) {
    console.error("Failed to restart Tor:", error);
  }
};

restartTor();

