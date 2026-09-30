const INITIAL_TOOLS = [
  { name: "Alpha", monthly: 3000, memo: "文章" },
  { name: "Beta", monthly: 0, memo: "調査" },
  { name: "Gamma", monthly: 1500, memo: "画像生成" },
];

const STORAGE_KEY = "ai-tool-comparison-memo";

const form = document.querySelector("#toolForm");
const editId = document.querySelector("#editId");
const nameInput = document.querySelector("#nameInput");
const monthlyInput = document.querySelector("#monthlyInput");
const memoInput = document.querySelector("#memoInput");
const formError = document.querySelector("#formError");
const submitButton = document.querySelector("#submitButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const searchInput = document.querySelector("#searchInput");
const sortAscButton = document.querySelector("#sortAscButton");
const sortDescButton = document.querySelector("#sortDescButton");
const resetButton = document.querySelector("#resetButton");
const csvButton = document.querySelector("#csvButton");
const tableBody = document.querySelector("#toolTableBody");
const resultCount = document.querySelector("#resultCount");
const emptyMessage = document.querySelector("#emptyMessage");
const initialJson = document.querySelector("#initialJson");

let tools = loadTools();

initialJson.textContent = JSON.stringify(INITIAL_TOOLS);
render();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const validation = validateForm();

  if (!validation.ok) {
    formError.textContent = validation.message;
    return;
  }

  const tool = {
    id: editId.value || createId(),
    name: nameInput.value.trim(),
    monthly: Number(monthlyInput.value),
    memo: memoInput.value.trim(),
  };

  const duplicate = tools.some(
    (item) => item.id !== tool.id && item.name.trim().toLowerCase() === tool.name.toLowerCase()
  );

  if (duplicate) {
    formError.textContent = "同じ名前のツールは登録できません。";
    return;
  }

  if (editId.value) {
    tools = tools.map((item) => (item.id === tool.id ? tool : item));
  } else {
    tools.push(tool);
  }

  saveTools();
  clearForm();
  render();
});

cancelEditButton.addEventListener("click", clearForm);

searchInput.addEventListener("input", render);

sortAscButton.addEventListener("click", () => {
  tools.sort((a, b) => a.monthly - b.monthly || a.name.localeCompare(b.name, "ja"));
  saveTools();
  render();
});

sortDescButton.addEventListener("click", () => {
  tools.sort((a, b) => b.monthly - a.monthly || a.name.localeCompare(b.name, "ja"));
  saveTools();
  render();
});

resetButton.addEventListener("click", () => {
  if (!window.confirm("保存済みの変更を消して初期状態に戻しますか？")) {
    return;
  }

  tools = withIds(INITIAL_TOOLS);
  saveTools();
  clearForm();
  searchInput.value = "";
  render();
});

csvButton.addEventListener("click", () => {
  const rows = [["名前", "月額料金", "メモ"], ...getFilteredTools().map(({ name, monthly, memo }) => [name, monthly, memo])];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-tool-memo.csv";
  link.click();
  URL.revokeObjectURL(url);
});

function loadTools() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return withIds(INITIAL_TOOLS);
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return withIds(INITIAL_TOOLS);
    }
    return parsed.map((item) => ({
      id: item.id || createId(),
      name: String(item.name || ""),
      monthly: Number(item.monthly) || 0,
      memo: String(item.memo || ""),
    }));
  } catch {
    return withIds(INITIAL_TOOLS);
  }
}

function withIds(items) {
  return items.map((item) => ({ ...item, id: createId() }));
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `tool-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function saveTools() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}

function validateForm() {
  const name = nameInput.value.trim();
  const monthly = monthlyInput.value;
  const memo = memoInput.value.trim();

  if (!name || !memo || monthly === "") {
    return { ok: false, message: "名前・月額料金・メモをすべて入力してください。" };
  }

  if (!/^(0|[1-9]\d*)$/.test(monthly) || !Number.isSafeInteger(Number(monthly))) {
    return { ok: false, message: "月額料金は0円以上の整数で入力してください。" };
  }

  return { ok: true };
}

function getFilteredTools() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    return tools;
  }

  return tools.filter((tool) => {
    return tool.name.toLowerCase().includes(query) || tool.memo.toLowerCase().includes(query);
  });
}

function render() {
  const filteredTools = getFilteredTools();
  tableBody.replaceChildren();

  filteredTools.forEach((tool) => {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    const monthlyTd = document.createElement("td");
    const memoTd = document.createElement("td");
    const actionTd = document.createElement("td");
    const actions = document.createElement("div");
    const editButton = document.createElement("button");
    const deleteButton = document.createElement("button");

    nameTd.textContent = tool.name;
    monthlyTd.textContent = `${tool.monthly.toLocaleString("ja-JP")}円`;
    memoTd.textContent = tool.memo;

    actions.className = "row-actions";
    editButton.type = "button";
    editButton.className = "secondary-button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => startEdit(tool.id));

    deleteButton.type = "button";
    deleteButton.className = "danger-button";
    deleteButton.textContent = "削除";
    deleteButton.addEventListener("click", () => deleteTool(tool.id));

    actions.append(editButton, deleteButton);
    actionTd.append(actions);
    tr.append(nameTd, monthlyTd, memoTd, actionTd);
    tableBody.append(tr);
  });

  resultCount.textContent = `${filteredTools.length}件`;
  emptyMessage.hidden = filteredTools.length > 0;
}

function startEdit(id) {
  const tool = tools.find((item) => item.id === id);
  if (!tool) {
    return;
  }

  editId.value = tool.id;
  nameInput.value = tool.name;
  monthlyInput.value = tool.monthly;
  memoInput.value = tool.memo;
  submitButton.textContent = "更新する";
  cancelEditButton.hidden = false;
  formError.textContent = "";
  nameInput.focus();
}

function deleteTool(id) {
  tools = tools.filter((item) => item.id !== id);
  saveTools();
  if (editId.value === id) {
    clearForm();
  }
  render();
}

function clearForm() {
  form.reset();
  editId.value = "";
  formError.textContent = "";
  submitButton.textContent = "追加する";
  cancelEditButton.hidden = true;
}

function escapeCsvCell(value) {
  const raw = String(value);
  const cell = /^[\s\uFEFF]*[=+\-@]/u.test(raw) ? `'${raw}` : raw;
  return `"${cell.replaceAll('"', '""')}"`;
}
