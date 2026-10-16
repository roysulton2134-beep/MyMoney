/**
 * chart-manager.js - Handles Chart.js instances and dynamic visualization
 * Supports responsive resizing and automatic Dark / Light mode theming.
 */

let comparisonChartInstance = null;
let trendChartInstance = null;
let expenseCategoryChartInstance = null;
let incomeCategoryChartInstance = null;

// Palette for Category Doughnuts
const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#64748B', '#14B8A6'
];

/**
 * Check if dark mode is active on document
 */
function isDarkModeActive() {
  return document.documentElement.classList.contains('dark') || document.body.classList.contains('dark');
}

/**
 * Custom Currency Formatter for Chart.js Tooltips & Ticks (Compact on Mobile)
 */
const currencyTickFormatter = (value) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1).replace('.0', '') + (isMobile ? 'M' : ' Jt');
  } else if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(0) + (isMobile ? 'k' : ' Rb');
  }
  return value;
};

/**
 * Initialize or Update All Charts
 * @param {Array} transactions - Filtered or full transaction array
 */
function updateAllCharts(transactions) {
  if (typeof Chart === 'undefined') {
    return;
  }

  const txList = transactions || (typeof getFilteredTransactions === 'function' ? getFilteredTransactions() : []);
  renderComparisonChart(txList);
  renderTrendChart(txList);
  renderCategoryDoughnuts(txList);
}

/**
 * 1. Perbandingan Pemasukan vs Pengeluaran (Grouped Bar Chart)
 */
function renderComparisonChart(transactions) {
  const canvas = document.getElementById('chartComparison');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isDark = isDarkModeActive();

  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const dateMap = {};

  sorted.forEach(t => {
    const d = t.date;
    if (!dateMap[d]) {
      dateMap[d] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      dateMap[d].income += t.amount;
    } else {
      dateMap[d].expense += t.amount;
    }
  });

  const dates = Object.keys(dateMap);
  const labels = dates.map(d => {
    const [y, m, day] = d.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(day, 10)} ${monthNames[parseInt(m, 10) - 1]}`;
  });

  const incomeData = dates.map(d => dateMap[d].income);
  const expenseData = dates.map(d => dateMap[d].expense);
  const hasData = dates.length > 0;

  if (comparisonChartInstance) {
    comparisonChartInstance.destroy();
  }

  comparisonChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hasData ? labels : ['Belum Ada Data'],
      datasets: [
        {
          label: 'Pemasukan',
          data: hasData ? incomeData : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10B981',
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.6
        },
        {
          label: 'Pengeluaran',
          data: hasData ? expenseData : [0],
          backgroundColor: 'rgba(244, 63, 94, 0.85)',
          borderColor: '#F43F5E',
          borderWidth: 1.5,
          borderRadius: 6,
          barPercentage: 0.65,
          categoryPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            boxWidth: (typeof window !== 'undefined' && window.innerWidth < 640) ? 6 : 8,
            padding: (typeof window !== 'undefined' && window.innerWidth < 640) ? 5 : 10,
            color: isDark ? '#E2E8F0' : '#334155',
            font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: (typeof window !== 'undefined' && window.innerWidth < 640) ? 9.5 : 12 }
          }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.9)',
          titleColor: '#FFFFFF',
          bodyColor: '#F8FAFC',
          padding: 8,
          cornerRadius: 8,
          titleFont: { size: 11, weight: 'bold' },
          bodyFont: { size: 11 },
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${formatRupiah(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: (typeof window !== 'undefined' && window.innerWidth < 640) ? 8.5 : 11 },
            maxTicksLimit: (typeof window !== 'undefined' && window.innerWidth < 640) ? 4 : 7,
            maxRotation: 0,
            autoSkip: true
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.6)' },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: (typeof window !== 'undefined' && window.innerWidth < 640) ? 8.5 : 11 },
            maxTicksLimit: (typeof window !== 'undefined' && window.innerWidth < 640) ? 4 : 6,
            callback: currencyTickFormatter
          }
        }
      }
    }
  });
}

/**
 * 2. Tren Akumulasi Arus Kas (Line / Area Chart)
 */
function renderTrendChart(transactions) {
  const canvas = document.getElementById('chartTrend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const isDark = isDarkModeActive();

  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const dateMap = {};

  sorted.forEach(t => {
    const d = t.date;
    if (!dateMap[d]) {
      dateMap[d] = { income: 0, expense: 0 };
    }
    if (t.type === 'income') {
      dateMap[d].income += t.amount;
    } else {
      dateMap[d].expense += t.amount;
    }
  });

  const dates = Object.keys(dateMap);
  const labels = dates.map(d => {
    const [y, m, day] = d.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${parseInt(day, 10)} ${monthNames[parseInt(m, 10) - 1]}`;
  });

  let runningBalance = 0;
  const balanceData = dates.map(d => {
    const net = dateMap[d].income - dateMap[d].expense;
    runningBalance += net;
    return runningBalance;
  });

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(79, 70, 229, 0.30)');
  gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

  trendChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates.length > 0 ? labels : ['Belum Ada Data'],
      datasets: [
        {
          label: 'Saldo Kumulatif',
          data: dates.length > 0 ? balanceData : [0],
          fill: true,
          backgroundColor: gradient,
          borderColor: isDark ? '#F59E0B' : '#4F46E5',
          borderWidth: 2.5,
          tension: 0.3,
          pointBackgroundColor: isDark ? '#F59E0B' : '#4F46E5',
          pointBorderColor: isDark ? '#1E293B' : '#FFFFFF',
          pointBorderWidth: 2,
          pointRadius: (typeof window !== 'undefined' && window.innerWidth < 640) ? 2.5 : 4,
          pointHoverRadius: (typeof window !== 'undefined' && window.innerWidth < 640) ? 4 : 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.9)',
          padding: 8,
          cornerRadius: 8,
          titleFont: { size: 11, weight: 'bold' },
          bodyFont: { size: 11 },
          callbacks: {
            label: function(context) {
              return ` Saldo Berjalan: ${formatRupiah(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: (typeof window !== 'undefined' && window.innerWidth < 640) ? 8.5 : 11 },
            maxTicksLimit: (typeof window !== 'undefined' && window.innerWidth < 640) ? 4 : 7,
            maxRotation: 0,
            autoSkip: true
          }
        },
        y: {
          grid: { color: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 0.6)' },
          ticks: {
            color: isDark ? '#94A3B8' : '#64748B',
            font: { family: "'Plus Jakarta Sans', sans-serif", size: (typeof window !== 'undefined' && window.innerWidth < 640) ? 8.5 : 11 },
            maxTicksLimit: (typeof window !== 'undefined' && window.innerWidth < 640) ? 4 : 6,
            callback: currencyTickFormatter
          }
        }
      }
    }
  });
}

/**
 * 3. Diagram Kategori Pengeluaran & Pemasukan (Doughnut Charts)
 */
function renderCategoryDoughnuts(transactions) {
  const isDark = isDarkModeActive();
  const borderColor = isDark ? '#1E293B' : '#FFFFFF';

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // A. Expense by Category
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const expenseCatMap = {};
  let totalExpense = 0;

  expenseTransactions.forEach(t => {
    const cat = t.category || 'Lain-lain';
    expenseCatMap[cat] = (expenseCatMap[cat] || 0) + t.amount;
    totalExpense += t.amount;
  });

  const expenseLabels = Object.keys(expenseCatMap);
  const expenseValues = Object.values(expenseCatMap);

  const canvasExpense = document.getElementById('chartExpenseCategory');
  if (canvasExpense) {
    if (expenseCategoryChartInstance) expenseCategoryChartInstance.destroy();
    
    expenseCategoryChartInstance = new Chart(canvasExpense.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: expenseLabels.length > 0 ? expenseLabels : ['Tidak ada pengeluaran'],
        datasets: [{
          data: expenseValues.length > 0 ? expenseValues : [1],
          backgroundColor: expenseValues.length > 0 ? CATEGORY_COLORS : (isDark ? ['#334155'] : ['#E2E8F0']),
          borderWidth: 1.5,
          borderColor: borderColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: isMobile ? '58%' : '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: isMobile ? 6 : 9,
              padding: isMobile ? 3 : 8,
              color: isDark ? '#CBD5E1' : '#475569',
              font: { family: "'Plus Jakarta Sans', sans-serif", size: isMobile ? 8.5 : 11 },
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    const shortLabel = isMobile && label.length > 9 ? label.substring(0, 8) + '..' : label;
                    return {
                      text: shortLabel,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden: isNaN(data.datasets[0].data[i]) || (meta.data[i] && meta.data[i].hidden),
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            enabled: expenseValues.length > 0,
            padding: 8,
            cornerRadius: 8,
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              label: function(context) {
                const val = context.raw;
                const percentage = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${formatRupiah(val)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  // B. Income by Category
  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const incomeCatMap = {};
  let totalIncome = 0;

  incomeTransactions.forEach(t => {
    const cat = t.category || 'Lain-lain';
    incomeCatMap[cat] = (incomeCatMap[cat] || 0) + t.amount;
    totalIncome += t.amount;
  });

  const incomeLabels = Object.keys(incomeCatMap);
  const incomeValues = Object.values(incomeCatMap);

  const canvasIncome = document.getElementById('chartIncomeCategory');
  if (canvasIncome) {
    if (incomeCategoryChartInstance) incomeCategoryChartInstance.destroy();

    incomeCategoryChartInstance = new Chart(canvasIncome.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: incomeLabels.length > 0 ? incomeLabels : ['Tidak ada pemasukan'],
        datasets: [{
          data: incomeValues.length > 0 ? incomeValues : [1],
          backgroundColor: incomeValues.length > 0 ? ['#10B981', '#34D399', '#059669', '#6EE7B7', '#047857', '#A7F3D0'] : (isDark ? ['#334155'] : ['#E2E8F0']),
          borderWidth: 1.5,
          borderColor: borderColor
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: isMobile ? '58%' : '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: isMobile ? 6 : 9,
              padding: isMobile ? 3 : 8,
              color: isDark ? '#CBD5E1' : '#475569',
              font: { family: "'Plus Jakarta Sans', sans-serif", size: isMobile ? 8.5 : 11 },
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const meta = chart.getDatasetMeta(0);
                    const style = meta.controller.getStyle(i);
                    const shortLabel = isMobile && label.length > 9 ? label.substring(0, 8) + '..' : label;
                    return {
                      text: shortLabel,
                      fillStyle: style.backgroundColor,
                      strokeStyle: style.borderColor,
                      lineWidth: style.borderWidth,
                      hidden: isNaN(data.datasets[0].data[i]) || (meta.data[i] && meta.data[i].hidden),
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            enabled: incomeValues.length > 0,
            padding: 8,
            cornerRadius: 8,
            titleFont: { size: 11, weight: 'bold' },
            bodyFont: { size: 11 },
            callbacks: {
              label: function(context) {
                const val = context.raw;
                const percentage = totalIncome > 0 ? ((val / totalIncome) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${formatRupiah(val)} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
}
