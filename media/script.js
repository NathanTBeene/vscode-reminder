const vscode = acquireVsCodeApi();
let reminders = [];
let updateInterval;

document.getElementById("addBtn").addEventListener("click", () => {
  console.log("Add button clicked");
  const text = document.getElementById("reminderText").value.trim();
  const interval = parseFloat(
    document.getElementById("reminderInterval").value
  );

  if (text && interval) {
    vscode.postMessage({
      type: "addReminder",
      text: text,
      intervalMinutes: interval,
    });

    document.getElementById("reminderText").value = "";
    document.getElementById("reminderInterval").value = "";
  }
});

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.type === "updateReminders") {
    reminders = message.reminders;
    renderReminders();
  }
});

function renderReminders() {
  const welcome = document.getElementById("welcome");
  const list = document.getElementById("remindersList");

  if (reminders.length === 0) {
    welcome.style.display = "block";
    list.innerHTML = "";
    return;
  }

  welcome.style.display = "none";

  list.innerHTML = reminders
    .map((r) => {
      let statusBadge = "";
      let timeInfo = "";
      let classNames = "reminder";

      if (r.isActive) {
        if (r.isSnoozed) {
          statusBadge =
            '<span class="status-badge status-snoozed">SNOOZED</span>';
          classNames += " snoozed";
        } else {
          statusBadge =
            '<span class="status-badge status-active">ACTIVE</span>';
          classNames += " active";
        }

        if (r.nextTriggerTime) {
          const timeLeft = Math.max(0, r.nextTriggerTime - Date.now());
          const minutes = Math.floor(timeLeft / 60000);
          const seconds = Math.floor((timeLeft % 60000) / 1000);
          timeInfo = `${minutes}m ${seconds}s`;
        }
      } else {
        statusBadge =
          '<span class="status-badge status-inactive">INACTIVE</span>';
      }

      const toggleIcon = () => {
        if (r.isActive && r.isSnoozed) {
          return "debug-stop";
        } else if (r.isActive) {
          return "debug-pause";
        } else {
          return "play";
        }
      };

      // Format interval for display
      // E.g., "30 minutes", "1 hour 30 minutes", "45 seconds"
      const formatInterval = () => {
        const interval = r.intervalMinutes;

        if (interval < 1) {
          const seconds = Math.round(interval * 60);
          return `${seconds} second${seconds !== 1 ? "s" : ""}`;
        } else if (interval < 60) {
          const minutes = Math.floor(interval);
          return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
        } else {
          const hours = Math.floor(interval / 60);
          const minutes = Math.round(interval % 60);
          let result = `${hours} hour${hours !== 1 ? "s" : ""}`;
          if (minutes > 0) {
            result += ` ${minutes} minute${minutes !== 1 ? "s" : ""}`;
          }
          return result;
        }
      };

      return /* html */ `
        <div class="${classNames}">
          <div class="reminder-header">
            <div class="reminder-text">${r.text}</div>
            <div class="reminder-controls">
              <button class="icon-btn toggle-btn" data-id="${
                r.id
              }" title="Toggle active/inactive">
                <span class="codicon codicon-${toggleIcon()}"></span>
              </button>
              <button class="icon-btn delete-btn" data-id="${
                r.id
              }" title="Delete">
                  <span class="codicon codicon-trash delete"></span>
              </button>
            </div>
          </div>

          <div class="reminder-info">
            <div class="reminder-interval">
              ${statusBadge}
              ${r.isSnoozed ? "" : `<span>Every ${formatInterval()}</span>`}

            </div>

            <div class="reminder-time-info">
              <span class="codicon ${
                r.isActive ? "codicon-bell" : "codicon-bell-slash"
              }"></span>
              ${timeInfo ? `<div>${timeInfo}</div>` : ""}
            </div>
          </div>
        </div>
        `;
    })
    .join("");

  attachEventListeners();
}

function attachEventListeners() {
  document.querySelectorAll(".toggle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      toggleReminder(id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      deleteReminder(id);
    });
  });
}

function toggleReminder(id) {
  vscode.postMessage({
    type: "toggleReminder",
    id: id,
  });
}

function deleteReminder(id) {
  vscode.postMessage({
    type: "deleteReminder",
    id: id,
  });
}

// Update countdown every second
updateInterval = setInterval(() => {
  if (reminders.length > 0 && reminders.some((r) => r.isActive)) {
    renderReminders();
  }
}, 1000);

vscode.postMessage({ type: "getReminders" });
