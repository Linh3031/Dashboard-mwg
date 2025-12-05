// src/ui-notifications.js
export const notifications = {
    showNotification: (message, type = 'success') => {
        const notification = document.getElementById('notification');
        if (!notification) {
            console.log(`[Notification ${type}]: ${message}`); // Fallback nếu chưa có DOM
            return;
        }
        notification.textContent = message;
        notification.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-md text-white z-[1200] opacity-0 transition-opacity duration-500 transform translate-y-10 ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
        // Trigger reflow
        void notification.offsetWidth; 
        notification.classList.remove('hidden', 'opacity-0', 'translate-y-10');
        notification.classList.add('opacity-100', 'translate-y-0');

        setTimeout(() => {
             notification.classList.remove('opacity-100', 'translate-y-0');
             notification.classList.add('opacity-0', 'translate-y-10');
             setTimeout(() => notification.classList.add('hidden'), 500);
        }, 3000);
    }
};