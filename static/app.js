const STORAGE_USERS_KEY = 'wiseWalletUsers';
const STORAGE_CURRENT_USER = 'wiseWalletCurrentUser';

const DEFAULT_USER = {
  id: 'pixel',
  name: 'Pixel',
  email: 'pixel@demo.com',
  memberSince: 'Jan 2026',
  income: 85000,
  fixedExpenses: [
    { id: 'rent', name: 'Rent', amount: 20000, due: '1st of every month' },
    { id: 'postpaid', name: 'Safaricom Postpaid', amount: 3000, due: '5th of every month' },
    { id: 'electricity', name: 'Electricity (avg)', amount: 2000, due: '10th of every month' }
  ],
  transactions: [
    { id: 't1', date: '2026-07-24', name: 'Java House', meta: '08:42 AM · Dining', category: 'impulse', type: 'expense', amount: -450 },
    { id: 't2', date: '2026-07-24', name: 'Naivas Supermarket', meta: '07:10 AM · Groceries', category: 'essential', type: 'expense', amount: -2180 },
    { id: 't3', date: '2026-07-23', name: 'Safaricom Postpaid', meta: '6:00 PM · Bills', category: 'recurring', type: 'expense', amount: -1500 },
    { id: 't4', date: '2026-07-23', name: 'Uber', meta: '2:15 PM · Transport', category: 'essential', type: 'expense', amount: -620 },
    { id: 't5', date: '2026-07-21', name: 'Salary — TechCorp Ltd', meta: '9:00 AM · Income', category: 'income', type: 'income', amount: 85000 },
    { id: 't6', date: '2026-07-21', name: 'Zara — Two Rivers', meta: '4:40 PM · Shopping', category: 'impulse', type: 'expense', amount: -6400 },
    { id: 't7', date: '2026-07-21', name: 'Artcaffé', meta: '1:05 PM · Dining', category: 'impulse', type: 'expense', amount: -3140 }
  ],
  goals: [
    { id: 'g1', name: 'Emergency Fund', current: 37500, target: 50000 },
    { id: 'g2', name: 'New Laptop', current: 32000, target: 80000 },
    { id: 'g3', name: 'Zanzibar Trip', current: 9000, target: 60000 }
  ],
  prediction: { amount: 15000, locked: false },
  postedPredictions: [],
  messagingPhone: null,
  messagingEnabled: false,
};

function loadUsers() {
  const raw = localStorage.getItem(STORAGE_USERS_KEY);
  if (!raw) return { [DEFAULT_USER.id]: DEFAULT_USER };
  try {
    const users = JSON.parse(raw);
    if (!users || typeof users !== 'object') return { [DEFAULT_USER.id]: DEFAULT_USER };
    return users;
  } catch (error) {
    return { [DEFAULT_USER.id]: DEFAULT_USER };
  }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

function getCurrentUserId() {
  return localStorage.getItem(STORAGE_CURRENT_USER);
}

function setCurrentUserId(id) {
  localStorage.setItem(STORAGE_CURRENT_USER, id);
}

function getCurrentUser() {
  const users = loadUsers();
  let userId = getCurrentUserId();
  if (!userId || !users[userId]) {
    userId = Object.keys(users)[0] || DEFAULT_USER.id;
    if (!users[userId]) {
      users[userId] = DEFAULT_USER;
      saveUsers(users);
    }
    setCurrentUserId(userId);
  }
  return users[userId];
}

function saveCurrentUser(user) {
  const users = loadUsers();
  users[user.id] = user;
  saveUsers(users);
  setCurrentUserId(user.id);
}

function formatCurrency(value) {
  return Math.abs(value).toLocaleString();
}

function parseAmountText(text) {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, '').match(/[-+]?\d+/g);
  if (!cleaned) return 0;
  return Number(cleaned.join('')) || 0;
}

function getFixedExpensesTotal(user) {
  return user.fixedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
}

function getRentExpense(user) {
  let rent = user.fixedExpenses.find(expense => expense.id === 'rent');
  if (!rent) {
    rent = { id: 'rent', name: 'Rent', amount: 0, due: '1st of every month' };
    user.fixedExpenses.unshift(rent);
  }
  return rent;
}

function getTransactionSummary(user) {
  const spent = user.transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const categories = {};
  user.transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    categories[tx.category] = (categories[tx.category] || 0) + Math.abs(tx.amount);
  });
  return {
    spent: Math.abs(spent),
    count: user.transactions.length,
    categories
  };
}

function getBudgetStatus(user) {
  const fixed = getFixedExpensesTotal(user);
  const budget = Math.max(0, Number(user.income || 0) - fixed);
  const spent = getTransactionSummary(user).spent;
  const remaining = Math.max(0, budget - spent);
  const savingsRate = budget > 0 ? Math.round((remaining / Number(user.income || 1)) * 100) : 0;
  const percentUsed = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 100;
  let status = 'On track — keep going with your plan';
  if (spent > budget) {
    status = `Over budget by Ksh ${formatCurrency(spent - budget)}`;
  } else if (percentUsed >= 90) {
    status = 'Almost there — keep an eye on the remaining days';
  }
  return { fixed, budget, remaining, savingsRate, percentUsed, status };
}

function createUserFromEmail(email) {
  const safeEmail = String(email).trim().toLowerCase();
  const nameParts = safeEmail.split('@')[0].replace(/[._\d]+/g, ' ').trim().split(' ');
  const name = nameParts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'New User';
  const id = safeEmail.replace(/[^a-z0-9]/g, '_') || `user_${Date.now()}`;
  return {
    ...DEFAULT_USER,
    id,
    name,
    email: safeEmail,
    provider: 'Email'
  };
}

function formatDateLabel(dateString) {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateString === today) return 'Today';
  if (dateString === yesterday) return 'Yesterday';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
}

function loadUserIntoTopnav(user) {
  const avatar = document.querySelector('.topnav-avatar');
  if (!avatar) return;
  avatar.textContent = user.name?.charAt(0).toUpperCase() || 'P';
}

function initializeLogin() {
  const loginGoogle = document.getElementById('loginGoogle');
  const loginEmailButton = document.getElementById('loginEmail');
  const loginPhone = document.getElementById('loginPhone');
  const emailForm = document.getElementById('emailForm');
  const emailInput = document.getElementById('emailInput');
  const loginEmailContinue = document.getElementById('loginEmailContinue');

  const navigateWithUser = (user) => {
    saveCurrentUser(user);
    window.location.href = 'dashboard.html';
  };

  if (loginGoogle) {
    loginGoogle.addEventListener('click', () => {
      const users = loadUsers();
      if (!users[DEFAULT_USER.id]) {
        users[DEFAULT_USER.id] = DEFAULT_USER;
        saveUsers(users);
      }
      setCurrentUserId(DEFAULT_USER.id);
      window.location.href = 'dashboard.html';
    });
  }

  if (loginPhone) {
    loginPhone.addEventListener('click', () => {
      const users = loadUsers();
      if (!users[DEFAULT_USER.id]) {
        users[DEFAULT_USER.id] = DEFAULT_USER;
        saveUsers(users);
      }
      setCurrentUserId(DEFAULT_USER.id);
      window.location.href = 'dashboard.html';
    });
  }

  if (loginEmailButton && emailForm) {
    loginEmailButton.addEventListener('click', () => {
      emailForm.classList.toggle('open');
      emailInput?.focus();
    });
  }

  if (loginEmailContinue) {
    loginEmailContinue.addEventListener('click', (event) => {
      event.preventDefault();
      if (!emailInput?.value) return;
      const user = createUserFromEmail(emailInput.value);
      navigateWithUser(user);
    });
  }
}

function renderDashboard(user) {
  const spentEl = document.getElementById('dashSpentValue');
  const remainingEl = document.getElementById('dashRemainingValue');
  const txCountEl = document.getElementById('dashTransactionCount');
  const savingsEl = document.getElementById('dashSavingsRate');
  const statusEl = document.getElementById('dashboardStatus');
  const amountEl = document.getElementById('dashboardAmount');
  const budgetEl = document.getElementById('dashboardBudget');
  const insightEl = document.getElementById('dashboardInsightText');
  const topCats = document.getElementById('dashboardTopCategories');

  const summary = getTransactionSummary(user);
  const budgetInfo = getBudgetStatus(user);

  if (amountEl) amountEl.textContent = `Ksh ${formatCurrency(summary.spent)}`;
  if (budgetEl) budgetEl.textContent = `/ ${formatCurrency(budgetInfo.budget)}`;
  if (remainingEl) remainingEl.textContent = `${formatCurrency(budgetInfo.remaining)}`;
  if (spentEl) spentEl.textContent = `${formatCurrency(summary.spent)}`;
  if (txCountEl) txCountEl.textContent = summary.count.toString();
  if (savingsEl) savingsEl.textContent = `${budgetInfo.savingsRate}%`;
  if (statusEl) statusEl.textContent = budgetInfo.status;

  if (insightEl) {
    const entries = Object.entries(summary.categories).sort((a, b) => b[1] - a[1]);
    if (entries.length) {
      const [category, value] = entries[0];
      insightEl.innerHTML = `Your biggest expense is <b>${category}</b> at Ksh ${formatCurrency(value)}. Trim it by 10% and you save about <b>Ksh ${formatCurrency(Math.round(value * 0.1))}</b>.`;
    }
  }

  if (topCats) {
    const entries = Object.entries(summary.categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
    topCats.innerHTML = entries.map(([category, value]) => {
      const emoji = category === 'impulse' ? '🍽️' : category === 'essential' ? '🛒' : category === 'recurring' ? '🏠' : '💸';
      const color = category === 'impulse' ? 'var(--coral)' : category === 'essential' ? 'var(--violet)' : category === 'recurring' ? 'var(--amber)' : 'var(--mint)';
      const width = Math.min(100, Math.max(12, Math.round((value / (summary.spent || 1)) * 100)));
      return `
        <div class="cat-row">
          <div class="cat-ico" style="background: ${color}33;">${emoji}</div>
          <div class="cat-mid">
            <div class="cat-name">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
            <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${width}%; background:${color};"></div></div>
          </div>
          <div class="cat-right"><div class="cat-amt">${formatCurrency(value)}</div><div class="cat-pct">${Math.round((value / (summary.spent || 1)) * 100)}%</div></div>
        </div>
      `;
    }).join('');
  }
}

function renderTransactions(user) {
  const container = document.getElementById('transactionsContainer');
  const searchInput = document.querySelector('.search-bar input');
  const filterChips = [...document.querySelectorAll('.filter-chip')];
  const parseMpesaButton = document.getElementById('parseMpesa');
  const mpesaText = document.getElementById('mpesaText');
  const mpesaMessage = document.getElementById('mpesaMessage');

  if (!container) return;

  const grouped = user.transactions.reduce((acc, tx) => {
    const date = tx.date || new Date().toISOString().slice(0, 10);
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  container.innerHTML = sortedDates.map(date => {
    const transactions = grouped[date];
    const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const label = `${formatDateLabel(date)} — Ksh ${formatCurrency(Math.abs(total))}`;
    const rows = transactions.map(tx => {
      const sign = tx.amount >= 0 ? '+' : '−';
      const amount = formatCurrency(tx.amount);
      const positive = tx.amount >= 0;
      const category = tx.category || 'essential';
      const tagLabel = tx.category ? tx.category.charAt(0).toUpperCase() + tx.category.slice(1) : 'Expense';
      return `
        <div class="tx-row" data-category="${category}">
          <div class="tx-ico">${positive ? '💰' : '💸'}</div>
          <div class="tx-mid">
            <div class="tx-name">${tx.name}</div>
            <div class="tx-meta">${tx.meta}</div>
            <span class="tx-tag tag-${category}">${tagLabel}</span>
          </div>
          <div class="tx-amt" style="color:${positive ? 'var(--mint)' : 'inherit'}">${sign} ${amount}</div>
        </div>
      `;
    }).join('');
    return `
      <div class="tx-group-label">${label}</div>
      <div class="tx-card">${rows}</div>
    `;
  }).join('');

  const updateFilter = () => {
    const query = (searchInput?.value || '').toLowerCase();
    const activeCategory = document.querySelector('.filter-chip.active')?.textContent.toLowerCase() || 'all';
    const rows = [...container.querySelectorAll('.tx-row')];

    rows.forEach(row => {
      const name = row.querySelector('.tx-name')?.textContent.toLowerCase() || '';
      const meta = row.querySelector('.tx-meta')?.textContent.toLowerCase() || '';
      const tag = row.querySelector('.tx-tag')?.textContent.toLowerCase() || '';
      const category = row.dataset.category || '';
      const matchesQuery = !query || name.includes(query) || meta.includes(query) || tag.includes(query);
      const matchesCategory = activeCategory === 'all' || category.includes(activeCategory) || tag.includes(activeCategory);
      row.style.display = matchesQuery && matchesCategory ? '' : 'none';
    });

    [...container.querySelectorAll('.tx-card')].forEach(card => {
      const visible = [...card.querySelectorAll('.tx-row')].some(row => row.style.display !== 'none');
      card.style.display = visible ? '' : 'none';
      const label = card.previousElementSibling;
      if (label?.classList.contains('tx-group-label')) {
        label.style.display = visible ? '' : 'none';
      }
    });
  };

  if (searchInput) {
    searchInput.oninput = updateFilter;
  }
  filterChips.forEach(chip => {
    chip.onclick = () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      updateFilter();
    };
  });

  if (parseMpesaButton && mpesaText && mpesaMessage) {
    parseMpesaButton.onclick = () => {
      const text = mpesaText.value.trim();
      if (!text) {
        mpesaMessage.textContent = 'Paste some MPESA messages before parsing.';
        return;
      }
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      const newTransactions = [];
      lines.forEach((line, index) => {
        const amountMatch = line.match(/Ksh\s*([\d,]+)/i);
        if (!amountMatch) return;
        const amount = parseAmountText(amountMatch[1]);
        const isIncome = /received|credited|paid to you|deposit/i.test(line);
        const category = isIncome ? 'income' : /rent|loan|rent/i.test(line) ? 'recurring' : /fuel|shopping|dining|transfer|pay|purchase|withdrawn|sent/i.test(line) ? 'impulse' : 'essential';
        const descriptionMatch = line.match(/(?:to|from)\s+([A-Za-z0-9 ]+)/i);
        const description = descriptionMatch ? descriptionMatch[1].trim() : line.slice(0, 24);
        newTransactions.push({
          id: `mpesa_${Date.now()}_${index}`,
          date: new Date().toISOString().slice(0, 10),
          name: description,
          meta: 'Imported from M-PESA',
          category,
          type: isIncome ? 'income' : 'expense',
          amount: isIncome ? amount : -amount
        });
      });
      if (!newTransactions.length) {
        mpesaMessage.textContent = 'No valid Ksh amounts found in the pasted text.';
        return;
      }
      user.transactions = [...newTransactions, ...user.transactions];
      saveCurrentUser(user);
      mpesaMessage.textContent = `Imported ${newTransactions.length} transaction${newTransactions.length === 1 ? '' : 's'} from M-PESA.`;
      renderTransactions(user);
      renderDashboard(user);
      renderPredictions(user);
      renderRecurring(user);
      checkAndShowOverspendAlert(user);
    };
  }

  updateFilter();
}

function renderPredictions(user) {
  const predictionInput = document.getElementById('predictionInput');
  const lockButton = document.getElementById('lockPrediction');
  const postButton = document.getElementById('postPrediction');
  const postMessage = document.getElementById('postMessage');
  const liveLabel = document.getElementById('liveLabel');
  const liveDays = document.getElementById('liveDays');
  const hint = document.getElementById('predictionHint');
  const warning = document.getElementById('predictionWarning');
  const spent = getTransactionSummary(user).spent;
  const today = new Date();
  const dayOfWeek = today.getDay();
  const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek;

  const getWeekRange = () => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const formatDate = (date) => date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
    return `${formatDate(startOfWeek)} – ${formatDate(endOfWeek)}`;
  };

  const weekRange = getWeekRange();
  const currentWeekEl = document.getElementById('currentWeek');
  if (currentWeekEl) currentWeekEl.textContent = weekRange;

  const updatePrediction = () => {
    if (!predictionInput) return;
    const amount = parseAmountText(predictionInput.value) || user.prediction.amount || 15000;
    user.prediction.amount = amount;
    if (liveLabel) liveLabel.textContent = `Tracking against your Ksh ${formatCurrency(amount)} prediction`;
    if (liveDays) liveDays.textContent = `Day ${Math.min(dayNumber, 7)} of 7`;
    if (warning) {
      if (spent > amount) {
        warning.textContent = `Warning: spend of Ksh ${formatCurrency(spent)} exceeds your prediction of Ksh ${formatCurrency(amount)}.`;
      } else {
        warning.textContent = `Safe zone: you can spend up to Ksh ${formatCurrency(amount - spent)} more this week.`;
      }
    }
    saveCurrentUser(user);
  };

  const setPredictionLock = (locked) => {
    if (!predictionInput || !lockButton || !hint) return;
    user.prediction.locked = locked;
    predictionInput.disabled = locked;
    lockButton.textContent = locked ? 'Unlock' : 'Lock it in';
    lockButton.classList.toggle('locked', locked);
    hint.textContent = locked ? 'Prediction is locked. Unlock to make changes.' : "Locked predictions can't be edited once the week starts — that's the point 😂";
    saveCurrentUser(user);
  };

  const postPrediction = () => {
    if (!predictionInput || !postMessage) return;
    const amount = parseAmountText(predictionInput.value) || user.prediction.amount || 15000;
    if (!user.postedPredictions) user.postedPredictions = [];
    const postedEntry = {
      id: `pred_${Date.now()}`,
      weekRange,
      amount,
      postedDate: new Date().toISOString(),
      locked: user.prediction.locked
    };
    user.postedPredictions.push(postedEntry);
    saveCurrentUser(user);
    postMessage.textContent = `✓ Posted prediction of Ksh ${formatCurrency(amount)} for ${weekRange}`;
    postButton.textContent = 'Prediction posted';
    postButton.disabled = true;
    renderPostedPredictions(user);
  };

  if (predictionInput) {
    predictionInput.value = user.prediction.amount.toString();
    predictionInput.oninput = updatePrediction;
  }
  if (lockButton) {
    setPredictionLock(user.prediction.locked);
    lockButton.onclick = () => setPredictionLock(!user.prediction.locked);
  }
  if (postButton) {
    postButton.onclick = postPrediction;
  }
  updatePrediction();
}

function renderPostedPredictions(user) {
  const container = document.getElementById('postedPredictionsContainer');
  if (!container) return;
  if (!user.postedPredictions || user.postedPredictions.length === 0) {
    container.innerHTML = '';
    return;
  }
  const sorted = [...user.postedPredictions].sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  container.innerHTML = sorted.map((pred) => {
    const spent = getTransactionSummary(user).spent;
    const diff = spent - pred.amount;
    const isOver = diff > 0;
    const verdict = isOver ? 'Tracking over' : 'Within budget';
    const verdictEmoji = isOver ? '📈' : '✅';
    const verdictStyle = isOver ? 'var(--coral)' : 'var(--mint)';
    return `
      <div class="review-card" style="opacity: 0.9; cursor: pointer;" onclick="alert('Prediction for ' + '${pred.weekRange}' + ':\\n\\nTarget: Ksh ' + '${formatCurrency(pred.amount)}' + '\\nSpent: Ksh ' + '${formatCurrency(spent)}' + '\\nStatus: ' + '${verdict}')">
        <div class="review-top">
          <span class="review-week">${pred.weekRange}</span>
          <span class="review-verdict" style="background: ${verdictStyle}20; color: ${verdictStyle};">${verdictEmoji} ${verdict}</span>
        </div>
        <div class="review-nums">
          <div class="review-num"><div class="review-num-label">Predicted</div><div class="review-num-val">${formatCurrency(pred.amount)}</div></div>
          <div class="review-num"><div class="review-num-label">Current spend</div><div class="review-num-val">${formatCurrency(spent)}</div></div>
          <div class="review-num"><div class="review-num-label">Difference</div><div class="review-num-val" style="color: ${verdictStyle};">${isOver ? '+' : ''}${formatCurrency(Math.abs(diff))}</div></div>
        </div>
        <div class="review-bar-track"><div class="review-bar-fill" style="width: ${Math.min(100, Math.round((spent / pred.amount) * 100))}%; background: ${verdictStyle};"></div></div>
      </div>
    `;
  }).join('');
}


function renderRecurring(user) {
  const incomeAmount = document.getElementById('incomeAmount');
  const rentAmount = document.getElementById('rentAmount');
  const summaryIncome = document.getElementById('summaryIncome');
  const summaryRent = document.getElementById('summaryRent');
  const summaryFixed = document.getElementById('summaryFixed');
  const summaryFree = document.getElementById('summaryFree');
  const saveIncome = document.getElementById('saveIncome');
  const fixedExpenseName = document.getElementById('fixedExpenseName');
  const fixedExpenseAmount = document.getElementById('fixedExpenseAmount');
  const fixedExpenseDue = document.getElementById('fixedExpenseDue');
  const addExpense = document.getElementById('addExpense');
  const fixedExpensesList = document.getElementById('fixedExpensesList');

  const rent = getRentExpense(user);

  const updateSummary = () => {
    const incomeValue = Number((incomeAmount?.value || '').replace(/[^\d]/g, '')) || user.income;
    const rentValue = Number((rentAmount?.value || '').replace(/[^\d]/g, '')) || rent.amount;
    user.income = incomeValue;
    rent.amount = rentValue;
    const fixedTotal = getFixedExpensesTotal(user);
    const spent = getTransactionSummary(user).spent;
    const free = Math.max(0, incomeValue - fixedTotal - spent);
    if (summaryIncome) summaryIncome.textContent = `+ ${formatCurrency(incomeValue)}`;
    if (summaryFixed) summaryFixed.textContent = `− ${formatCurrency(fixedTotal)}`;
    if (summaryRent) summaryRent.textContent = `− ${formatCurrency(rentValue)}`;
    if (summaryFree) summaryFree.textContent = `Ksh ${formatCurrency(free)}`;
    saveCurrentUser(user);
  };

  const renderExpenses = () => {
    if (!fixedExpensesList) return;
    fixedExpensesList.innerHTML = user.fixedExpenses.map(expense => `
      <div class="fixed-list-row">
        <div class="fixed-ico" style="background:var(--coral-soft);">🏠</div>
        <div class="fixed-mid">
          <div class="fixed-name">${expense.name}</div>
          <div class="fixed-due">Due ${expense.due}</div>
        </div>
        <div class="fixed-amt">${formatCurrency(expense.amount)}</div>
      </div>
    `).join('');
  };

  if (incomeAmount) incomeAmount.value = user.income.toString();
  if (rentAmount) rentAmount.value = rent.amount.toString();
  renderExpenses();
  updateSummary();

  if (saveIncome) {
    saveIncome.onclick = (event) => {
      event.preventDefault();
      updateSummary();
    };
  }

  if (addExpense) {
    addExpense.onclick = (event) => {
      event.preventDefault();
      const name = fixedExpenseName?.value.trim();
      const amount = Number((fixedExpenseAmount?.value || '').replace(/[^\d]/g, '')) || 0;
      const due = fixedExpenseDue?.value.trim() || 'Added this session';
      if (!name || amount <= 0) return;
      user.fixedExpenses.push({ id: `fixed_${Date.now()}`, name, amount, due });
      saveCurrentUser(user);
      fixedExpenseName.value = '';
      fixedExpenseAmount.value = '';
      fixedExpenseDue.value = '';
      renderExpenses();
      updateSummary();
    };
  }
}

function renderProfile(user) {
  const profileName = document.getElementById('profileName');
  const profileSub = document.getElementById('profileSub');
  const profileSignin = document.getElementById('profileSignin');
  const avatarDisplay = document.getElementById('avatarDisplay');
  const transactionCount = document.getElementById('profileTransactionCount');
  const savingsRate = document.getElementById('profileSavingsRate');
  const goalsCount = document.getElementById('profileGoalsCount');

  if (profileName) profileName.textContent = user.name;
  if (profileSub) profileSub.textContent = `Member since ${user.memberSince}`;
  if (profileSignin) profileSignin.textContent = `🔵 Signed in with ${user.provider} · ${user.email}`;
  if (transactionCount) transactionCount.textContent = getTransactionSummary(user).count.toString();
  if (savingsRate) savingsRate.textContent = `${getBudgetStatus(user).savingsRate}%`;
  if (goalsCount) goalsCount.textContent = user.goals.length.toString();

  if (avatarDisplay) {
    if (user.avatar) {
      avatarDisplay.style.backgroundImage = `url(${user.avatar})`;
      avatarDisplay.style.backgroundSize = 'cover';
      avatarDisplay.style.backgroundPosition = 'center';
      avatarDisplay.textContent = '';
    } else {
      avatarDisplay.style.backgroundImage = '';
      avatarDisplay.textContent = user.name.charAt(0).toUpperCase();
    }
  }

  const profileStats = document.querySelectorAll('.profile-stats .pstat');
  profileStats.forEach((stat, index) => {
    stat.style.cursor = 'pointer';
    stat.title = index === 0 ? 'View transactions' : index === 1 ? 'View predictions' : 'View goals';
    stat.onclick = () => {
      if (index === 0) window.location.href = 'transactions.html';
      if (index === 1) window.location.href = 'predictions.html';
      if (index === 2) window.location.href = 'goals.html';
    };
  });

  const settingsRows = document.querySelectorAll('.settings-row:not(a)');
  settingsRows.forEach((row) => {
    row.style.cursor = 'pointer';
    const label = row.querySelector('.settings-label')?.textContent || '';
    row.onclick = () => {
      const messages = {
        'Personal details': `Update your name, email, and profile info.`,
        'Sign-in method — Google': `Manage your Google account connection.`,
        'Linked accounts & SMS sync': `Connect M-PESA or other payment methods for auto-sync.`,
        'Notifications': `Choose how you want to be alerted about spending.`,
        'Appearance': `Switch between light and dark themes.`,
        'Privacy & security': `Control your data privacy and security settings.`,
        'Help center': `Browse FAQs and get support.`
      };
      const msg = messages[label] || 'Coming soon!';
      alert(`${label}\n\n${msg}`);
    };
  });
}


function sendSMSAlert(user, message) {
  if (!user.messagingEnabled || !user.messagingPhone) return;
  console.log(`[SMS to ${user.messagingPhone}] ${message}`);
  try {
    const maxChars = 160;
    const trimmed = message.substring(0, maxChars);
    if (window.Cordova) {
      window.plugins.sms.send(user.messagingPhone, trimmed);
    }
  } catch (error) {
    console.log('SMS not yet available — would send: ' + message);
  }
}

function checkAndShowOverspendAlert(user) {
  const spent = getTransactionSummary(user).spent;
  const prediction = user.prediction.amount || 15000;
  const isOverspent = spent > prediction;
  const alertContainer = document.getElementById('overspendAlert') || (() => {
    const div = document.createElement('div');
    div.id = 'overspendAlert';
    div.style.position = 'fixed';
    div.style.top = '0';
    div.style.left = '0';
    div.style.right = '0';
    div.style.zIndex = '9999';
    div.style.backgroundColor = 'var(--coral)';
    div.style.color = '#fff';
    div.style.padding = '16px 20px';
    div.style.textAlign = 'center';
    div.style.fontWeight = '600';
    div.style.fontSize = '14px';
    div.style.display = 'none';
    document.body.insertBefore(div, document.body.firstChild);
    return div;
  })();

  if (isOverspent) {
    const overage = spent - prediction;
    const msg = `⚠️ Caution: You've overspent by Ksh ${formatCurrency(overage)} against your Ksh ${formatCurrency(prediction)} prediction.`;
    alertContainer.textContent = msg;
    alertContainer.style.display = 'block';
    sendSMSAlert(user, msg);
  } else {
    alertContainer.style.display = 'none';
  }
}

function initializePage() {
  const user = getCurrentUser();
  loadUserIntoTopnav(user);
  initializeLogin();
  renderDashboard(user);
  renderTransactions(user);
  renderPredictions(user);
  renderPostedPredictions(user);
  renderRecurring(user);
  renderProfile(user);
  checkAndShowOverspendAlert(user);
}

window.addEventListener('DOMContentLoaded', initializePage);

