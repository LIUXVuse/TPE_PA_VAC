import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800/80 border border-gray-600 rounded-2xl shadow-2xl max-w-2xl w-full p-8 text-white relative transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-300">系統使用說明</h2>
        
        <div className="space-y-6 text-gray-300">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">關於權重排名系統</h3>
            <p>
              本系統採用權重排名來決定假期的優先順序。權重為 1 到 10 的數字，<strong className="text-blue-300">數字越小，代表您的期望越高，優先順位也越高</strong>。
              即使某個假期的名額已滿，您仍然可以登記，系統會將您列入候補名單。若有已批准的成員取消，候補名單會依權重順序遞補。
            </p>
          </div>
          
          <div className="bg-yellow-900/50 border border-yellow-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-yellow-300 mb-2">最重要的規則：年度權重唯一性</h3>
            <p className="font-medium">
              為了確保公平性，<strong className="text-yellow-200">每位成員在同一個日曆年度內，每一個權重數值 (1, 2, 3...) 都只能使用一次</strong>。
              例如，如果您在二月連假使用了權重 `1`，那麼在同年度接下來的所有假期中，您將無法再次使用權重 `1`。請謹慎規劃您的高優先權重！
            </p>
          </div>

          <div className="bg-red-900/50 border border-red-700 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-red-300 mb-2">注意：「自動分配剩餘假期」按鈕</h3>
            <p className="font-medium">
              此按鈕為 <strong className="text-red-200">Leader 專用功能</strong>，用於在所有成員都完成登記後，公平地將剩餘的假期名額分配給休假最少的成員。
              <strong className="text-red-200">一般成員請不要點擊此按鈕</strong>，以免影響最終的排班結果。
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default HelpModal;
