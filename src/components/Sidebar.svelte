<script>
  /* global feather */
  import { onMount, afterUpdate } from 'svelte';
  
  // [PHẪU THUẬT LOGIC 1]: Import thêm userProfile
  import { activeTab, drawerState, isAdmin, modalState, currentUser, firebaseStore, userProfile } from '../stores.js';
  
  import { getAuth, updatePassword } from 'firebase/auth';
  import { authService } from '../services/auth.service.js';

  let isMobileOpen = false;

  // --- STATE THÔNG TIN USER & ĐỔI MẬT KHẨU ---
  let daysRemaining = 0;
  let showPassModal = false;
  let newPass = '';
  let isUpdatingPass = false;
  let passMsg = { text: '', type: '' };

  // [PHẪU THUẬT LOGIC 2]: Đọc thẳng dữ liệu từ Store toàn cục thay vì tự đi fetch Firebase
  $: userData = $userProfile;

  $: if (userData && userData.expireAt) {
      const diff = userData.expireAt - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  } else {
      daysRemaining = 0;
  }

  function formatExpireDate(timestamp) {
      if (!timestamp) return 'Vĩnh viễn';
      const d = new Date(timestamp);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  async function handleChangePassword() {
      if (newPass.length < 6) {
          passMsg = { text: 'Mật khẩu phải có tối thiểu 6 ký tự!', type: 'error' };
          return;
      }
      isUpdatingPass = true;
      try {
          const auth = getAuth();
          if (auth.currentUser) {
              await updatePassword(auth.currentUser, newPass);
              passMsg = { text: 'Đổi mật khẩu thành công!', type: 'success' };
              setTimeout(() => { 
                  showPassModal = false; 
                  newPass = ''; 
                  passMsg = {text:'', type:''}; 
              }, 2000);
          } else {
              passMsg = { text: 'Không tìm thấy phiên đăng nhập!', type: 'error' };
          }
      } catch (e) {
          if (e.code === 'auth/requires-recent-login') {
              passMsg = { text: 'Vui lòng đăng xuất và đăng nhập lại để đổi MK!', type: 'error' };
          } else {
              passMsg = { text: `Lỗi: ${e.message}`, type: 'error' };
          }
      } finally {
          isUpdatingPass = false;
      }
  }

  async function handleLogout() {
      if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
          try {
              await authService.logoutUser();
              window.location.reload(); 
          } catch (e) {
              console.error(e);
              alert('Lỗi đăng xuất: ' + e.message);
          }
      }
  }

  function navigateTo(targetId) {
    const adminSafeZones = ['declaration-section', 'tools-section'];
    if ($isAdmin && !adminSafeZones.includes(targetId)) {
        isAdmin.set(false);
    }
    if (targetId === 'declaration-section' && !$isAdmin) {
        modalState.update(s => ({ ...s, activeModal: 'admin-modal' }));
        isMobileOpen = false; 
        return;
    }
    activeTab.set(targetId);
    isMobileOpen = false; 
  }

  function openDrawer(drawerId) {
    drawerState.update(state => ({ ...state, activeDrawer: drawerId }));
    isMobileOpen = false; 
  }

  $: currentTab = $activeTab;

  onMount(() => { if (typeof window.feather !== 'undefined') window.feather.replace(); });
  afterUpdate(() => { if (typeof window.feather !== 'undefined') window.feather.replace(); });
</script>

<button 
    class="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl md:hidden hover:bg-blue-700 transition-transform active:scale-95 flex items-center justify-center"
    on:click={() => isMobileOpen = !isMobileOpen}
>
    {#if isMobileOpen}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    {:else}
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
    {/if}
</button>

{#if isMobileOpen}
    <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-20 md:hidden transition-opacity" on:click={() => isMobileOpen = false}></div>
{/if}

<nav id="sidebar" class="bg-white/80 backdrop-blur-sm shadow-lg fixed top-0 left-0 h-full z-30 p-3 flex flex-col justify-between {isMobileOpen ? 'mobile-open' : ''}">
    <div>
        <button 
           class="nav-link flex items-center p-3 rounded-lg font-semibold mb-4 w-full transition-colors
           {currentTab === 'home-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
           on:click={() => navigateTo('home-section')}
         >
            <i data-feather="home"></i>
            <span class="menu-text">Hướng Dẫn & Góp Ý</span>
         </button>

        <ul class="space-y-2">
            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                  {currentTab === 'data-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('data-section')}
                >
                    <i data-feather="file-text"></i>
                    <span class="menu-text">Cập nhật dữ liệu</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                  {currentTab === 'health-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('health-section')}
                >
                    <i data-feather="activity"></i>
                    <span class="menu-text">Sức khỏe siêu thị</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'health-employee-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('health-employee-section')}
                >
                    <i data-feather="users"></i>
                    <span class="menu-text">Sức khỏe nhân viên</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'realtime-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('realtime-section')}
                >
                    <i data-feather="trending-up"></i>
                    <span class="menu-text">Doanh thu realtime</span>
                </button>
            </li>

            <li>
                <button 
                  class="nav-link flex items-center p-3 rounded-lg font-semibold w-full transition-colors
                         {currentTab === 'tools-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('tools-section')}
                >
                    <i data-feather="layers"></i>
                    <span class="menu-text">Công cụ khác</span>
                </button>
            </li>
        </ul>
    </div>

    <div class="flex flex-col gap-2">
        <ul class="space-y-2">
            <li>
                 <button 
                   id="interface-settings-btn" 
                   class="w-full flex items-center p-3 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold nav-link"
                   on:click={() => openDrawer('interface-drawer')}
                >
                    <i data-feather="settings"></i>
                    <span class="menu-text">Cài đặt giao diện</span>
                 </button>
            </li>

            <li>
                <button 
                  id="admin-access-btn" 
                  class="w-full flex items-center p-3 rounded-lg font-semibold transition-colors nav-link
                         {currentTab === 'declaration-section' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-200'}"
                  on:click={() => navigateTo('declaration-section')}
                >
                    <i data-feather="edit"></i>
                    <span class="menu-text">Khai báo</span>
                </button>
            </li>
        </ul>

        <div class="mt-2 pt-3 border-t border-gray-200 flex flex-col gap-1">
            <button 
                class="w-full flex items-center p-2 rounded-lg hover:bg-blue-50 transition-colors group nav-link relative"
                on:click={() => showPassModal = true}
                title="Bấm để đổi mật khẩu"
            >
                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <i data-feather="user" class="w-4 h-4"></i>
                </div>
                
                <div class="menu-text ml-3 flex flex-col items-start overflow-hidden text-left">
                    <span class="text-[11px] font-bold text-gray-800 truncate w-full leading-tight">
                        {$currentUser ? $currentUser.email : 'Đang tải...'}
                    </span>
                    
                    {#if userData}
                        {#if userData.expireAt}
                            <span class="text-[10px] font-bold {daysRemaining < 7 ? 'text-red-500' : 'text-emerald-600'} w-full truncate leading-tight mt-0.5">
                                Hạn: {formatExpireDate(userData.expireAt)} 
                                <span class="opacity-75 font-normal">({daysRemaining} ngày)</span>
                            </span>
                        {:else}
                            <span class="text-[10px] font-bold text-emerald-600 w-full truncate leading-tight mt-0.5">
                                Hạn: Vĩnh viễn
                            </span>
                        {/if}
                    {/if}
                </div>
            </button>

            <button 
                class="w-full flex items-center p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors group nav-link relative"
                on:click={handleLogout}
                title="Đăng xuất khỏi hệ thống"
            >
                <div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
                    <i data-feather="log-out" class="w-4 h-4"></i>
                </div>
                <div class="menu-text ml-3 flex flex-col items-start overflow-hidden text-left">
                    <span class="text-xs font-bold w-full leading-tight">
                        Đăng xuất
                    </span>
                </div>
            </button>
        </div>
    </div>
</nav>

{#if showPassModal}
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm" on:click={() => showPassModal = false}>
        <div class="bg-white rounded-xl shadow-2xl w-11/12 max-w-sm overflow-hidden" on:click|stopPropagation>
            <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50">
                <h3 class="font-bold text-blue-900 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    Đổi Mật Khẩu
                </h3>
                <button class="text-gray-400 hover:text-red-500" on:click={() => showPassModal = false}>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
            <div class="p-5">
                {#if passMsg.text}
                    <div class="mb-4 p-2.5 text-xs font-bold rounded-lg border {passMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}">
                        {passMsg.text}
                    </div>
                {/if}

                <label class="block text-xs font-bold text-gray-600 mb-1">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
                <input 
                    type="text" 
                    bind:value={newPass} 
                    class="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Nhập mật khẩu mới..."
                    on:keydown={(e) => e.key === 'Enter' && handleChangePassword()}
                >

                <button 
                    on:click={handleChangePassword} 
                    disabled={isUpdatingPass}
                    class="w-full mt-4 bg-blue-600 text-white font-bold py-2.5 rounded-lg shadow-sm hover:bg-blue-700 flex justify-center items-center gap-2 disabled:opacity-60 transition-colors"
                >
                    {#if isUpdatingPass}
                        <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Đang cập nhật...
                    {:else}
                        Xác nhận đổi
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
  #sidebar { 
    width: 68px;
    transition: transform 0.3s ease-in-out, width 0.3s ease-in-out; 
    overflow-x: hidden; 
  }
  #sidebar:hover { 
    width: 256px;
  }
  #sidebar.menu-locked:hover { 
    width: 68px;
  }
  #sidebar .nav-link, #sidebar button {
    white-space: nowrap;
    gap: 1rem;
    justify-content: flex-start;
  }
  .menu-text {
    transition: opacity 0.2s ease-in-out, width 0.3s ease-in-out;
    opacity: 0;
    white-space: nowrap;
    width: 0;
    overflow: hidden;
  }
  #sidebar:hover .menu-text {
    opacity: 1;
    transition-delay: 0.1s;
    width: auto;
  }
  #sidebar.menu-locked:hover .menu-text {
    opacity: 0;
    width: 0;
  }
  #sidebar :global(.feather) {
    width: 1.5rem;
    height: 1.5rem;
    stroke-width: 2;
    flex-shrink: 0;
  }
</style>