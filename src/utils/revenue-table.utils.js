import { getCompletionColor } from './kpi.utils.js';

export const revenueTableUtils = {
    getGroupHeaderClass(col) {
        let bg = '', border = 'border-r border-gray-200';
        if (col.group === 'dt') bg = 'bg-sky-100/80 text-sky-900';
        else if (col.group === 'ck') bg = 'bg-indigo-100/90 text-indigo-900';
        else if (col.group === 'tc') bg = 'bg-orange-100/80 text-orange-900';
        else if (col.group === 'cx') bg = 'bg-gray-200 text-gray-800';
        else if (col.group === 'ns') bg = 'bg-emerald-100 text-emerald-900';

        if (col.isLastInGroup) {
            if (col.group === 'dt') border = 'border-r-[2px] border-sky-400';
            else if (col.group === 'ck') border = 'border-r-[2px] border-indigo-400';
            else if (col.group === 'tc') border = 'border-r-[2px] border-orange-400';
            else if (col.group === 'cx') border = 'border-r-[2px] border-gray-400';
            else if (col.group === 'ns') border = 'border-r-[2px] border-emerald-400';
        }
        if (col.isFirstInGroup) {
            if (col.group === 'dt') border += ' border-l-[2px] border-l-sky-400';
            else if (col.group === 'ck') border += ' border-l-[2px] border-l-indigo-400';
            else if (col.group === 'tc') border += ' border-l-[2px] border-l-orange-400';
            else if (col.group === 'cx') border += ' border-l-[2px] border-l-gray-400';
            else if (col.group === 'ns') border += ' border-l-[2px] border-l-emerald-400';
        }
        return `${bg} ${border}`;
    },

    getGroupBodyClass(col) {
        let bg = '', border = 'border-r border-gray-200';
        if (col.group === 'dt') bg = 'bg-sky-50/40 group-hover:bg-sky-100/50';
        else if (col.group === 'ck') bg = 'bg-indigo-50/50 group-hover:bg-indigo-100/60';
        else if (col.group === 'tc') bg = 'bg-orange-50/40 group-hover:bg-orange-100/60';
        else if (col.group === 'cx') bg = 'bg-gray-50/80 group-hover:bg-gray-200/60';
        else if (col.group === 'ns') bg = 'bg-emerald-50/40 group-hover:bg-emerald-100/50';

        if (col.isLastInGroup) {
            if (col.group === 'dt') border = 'border-r-[2px] border-sky-300';
            else if (col.group === 'ck') border = 'border-r-[2px] border-indigo-300';
            else if (col.group === 'tc') border = 'border-r-[2px] border-orange-300';
            else if (col.group === 'cx') border = 'border-r-[2px] border-gray-300';
            else if (col.group === 'ns') border = 'border-r-[2px] border-emerald-300';
        }
        if (col.isFirstInGroup) {
            if (col.group === 'dt') border += ' border-l-[2px] border-l-sky-300';
            else if (col.group === 'ck') border += ' border-l-[2px] border-l-indigo-300';
            else if (col.group === 'tc') border += ' border-l-[2px] border-l-orange-300';
            else if (col.group === 'cx') border += ' border-l-[2px] border-l-gray-300';
            else if (col.group === 'ns') border += ' border-l-[2px] border-l-emerald-300';
        }
        return `${bg} ${border} transition-colors duration-150`;
    },

    getCellTextClass(item, colKey, userTarget, globalSettings) {
        const isBoldCol = ['doanhThu', 'doanhThuQuyDoi', 'doanhThuTraGop', 'doanhThuQuyDoiChuaXuat', 'hieuQuaQuyDoi', 'tyLeTraCham'].includes(colKey);
        let baseClass = isBoldCol ? 'font-bold text-gray-800' : 'text-gray-600';

        const targetSettings = userTarget || globalSettings;
        if (!targetSettings || Object.keys(targetSettings).length === 0) return baseClass;

        if (colKey === 'hieuQuaQuyDoi') {
            const actual = item.hieuQuaQuyDoi;
            const target = (targetSettings.phanTramQD || 0) / 100; 
            const colorClass = getCompletionColor(actual, target);
            return colorClass ? `${colorClass} font-bold` : baseClass;
        }
        
        if (colKey === 'tyLeTraCham') {
            const actual = item.tyLeTraCham;
            const target = (targetSettings.phanTramTC || 0) / 100;
            const colorClass = getCompletionColor(actual, target);
            return colorClass ? `${colorClass} font-bold` : baseClass;
        }

        return baseClass;
    },

    getRankIcon(index, topCount) {
        if (index === 0) return '🏆';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        if (index < topCount) return '⭐';
        return `#${index + 1}`;
    }
};