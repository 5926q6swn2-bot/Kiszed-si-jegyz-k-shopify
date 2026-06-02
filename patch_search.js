const fs = require('fs');
let content = fs.readFileSync('js/app.js', 'utf8');

const badgeStr = `
              let accountingBadgeHtml = '';
              if (m.isCOD) {
                  let badgeText = 'Függőben lévő elszámolás';
                  let badgeColor = '#f59e0b';
                  let badgeBg = '#fef3c7';

                  if (m.runData && m.runData.bankTransferredOrderIds && m.runData.bankTransferredOrderIds.includes(m.id)) {
                      badgeText = 'Bankba utalva';
                      badgeColor = '#3b82f6';
                      badgeBg = '#dbeafe';
                  } else if (m.runData && m.runData.uncollectedOrderIds && m.runData.uncollectedOrderIds.includes(m.id)) {
                      badgeText = 'Nincs beszedve';
                      badgeColor = '#ef4444';
                      badgeBg = '#fee2e2';
                  } else if (m.runData && m.runData.partialOrders && m.runData.partialOrders[m.id]) {
                      badgeText = 'Részlegesen beszedve';
                      badgeColor = '#f97316';
                      badgeBg = '#ffedd5';
                  } else if (m.runData && m.runData.isSettled) {
                      badgeText = 'Készpénzben elszámolva';
                      badgeColor = '#10b981';
                      badgeBg = '#d1fae5';
                  }

                  accountingBadgeHtml = \`<span style="font-size: 11px; background: \${badgeBg}; color: \${badgeColor}; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-currency-circle-dollar" style="font-size: 13px;"></i> \${badgeText}</span>\`;
              } else {
                  accountingBadgeHtml = \`<span style="font-size: 11px; background: #f1f5f9; color: #64748b; padding: 2px 8px; border-radius: 4px; font-weight: 700; margin-left: 5px; display: flex; align-items: center; gap: 4px;"><i class="ph-bold ph-prohibit" style="font-size: 13px;"></i> Nincs utánvét</span>\`;
              }
`;

const exactFind = `el.innerHTML = \`
                  <div class="s-section-info" style="flex: 1;">
                      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">`;
                      
const exactReplace = badgeStr + `\n              el.innerHTML = \`
                  <div class="s-section-info" style="flex: 1;">
                      <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px;">\n`;

content = content.replace(exactFind, exactReplace);

const targetStr2 = `                          <span style="font-size: 11px; background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-weight: 600; display: flex; align-items: center; gap: 5px;"><i class="ph-bold ph-calendar" style="font-size: 13px;"></i> \${m.runDate}</span>`;
const replaceStr2 = targetStr2 + `\n                          \${accountingBadgeHtml}`;

content = content.replace(targetStr2, replaceStr2);

fs.writeFileSync('js/app.js', content, 'utf8');
console.log('Successfully patched search results!');
