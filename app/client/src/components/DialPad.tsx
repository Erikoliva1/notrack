import { useState, memo } from 'react';

interface DialPadProps {
  onNumberClick: (number: string) => void;
  onCall: () => void;
  onEndCall: () => void;
  displayValue: string;
  isInCall: boolean;
}

const DialPad: React.FC<DialPadProps> = ({
  onNumberClick,
  onCall,
  onEndCall,
  displayValue,
  isInCall,
}) => {
  const [flashingButton, setFlashingButton] = useState<string | null>(null);

  const handleButtonClick = (value: string) => {
    setFlashingButton(value);
    onNumberClick(value);
    setTimeout(() => setFlashingButton(null), 300);
  };

  const buttons = [
    { label: '1', value: '1' },
    { label: '2', value: '2', subtext: 'ABC' },
    { label: '3', value: '3', subtext: 'DEF' },
    { label: '4', value: '4', subtext: 'GHI' },
    { label: '5', value: '5', subtext: 'JKL' },
    { label: '6', value: '6', subtext: 'MNO' },
    { label: '7', value: '7', subtext: 'PQRS' },
    { label: '8', value: '8', subtext: 'TUV' },
    { label: '9', value: '9', subtext: 'WXYZ' },
    { label: '*', value: '*' },
    { label: '0', value: '0', subtext: '+' },
    { label: '#', value: '#' },
  ];

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Input Display - Terminal Style */}
      <div className="mb-6">
        <div className="bg-black border border-[#00ff41] p-4 h-16 flex items-center justify-center box-glow">
          <div className="text-xs text-[#00ff41] absolute top-2 left-2 opacity-50">
            &gt; INPUT:
          </div>
          <input
            type="text"
            value={displayValue}
            readOnly
            className="w-full text-center text-2xl font-mono bg-transparent outline-none text-[#00ff41] text-glow tracking-[0.3em]"
            placeholder="_ _ _ - _ _ _"
          />
        </div>
      </div>

      {/* Security Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {buttons.map((button) => (
          <button
            key={button.value}
            onClick={() => handleButtonClick(button.value)}
            className={`bg-black border border-[#333] hover:border-[#00ff41] active:border-[#00ff41]
                     h-16 flex flex-col items-center justify-center 
                     transition-all duration-150 relative overflow-hidden
                     ${flashingButton === button.value ? 'button-flash' : ''}
                     ${isInCall ? 'opacity-50 cursor-not-allowed' : 'hover:box-glow cursor-pointer'}`}
            disabled={isInCall}
          >
            <span className="text-2xl font-bold text-[#00ff41] text-glow">
              {button.label}
            </span>
            {button.subtext && (
              <span className="text-[10px] text-[#00ff41] opacity-50 mt-0.5 tracking-wider">
                {button.subtext}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action Buttons - Terminal Style */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCall}
          disabled={isInCall || displayValue.length === 0}
          className={`py-4 font-bold font-mono transition-all duration-200 border
                    ${
                      isInCall || displayValue.length === 0
                        ? 'bg-[#111] border-[#333] text-[#333] cursor-not-allowed'
                        : 'bg-black border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black box-glow'
                    }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-lg">[INITIATE]</span>
          </div>
        </button>

        <button
          onClick={onEndCall}
          disabled={!isInCall}
          className={`py-4 font-bold font-mono transition-all duration-200 border
                    ${
                      !isInCall
                        ? 'bg-[#111] border-[#333] text-[#333] cursor-not-allowed'
                        : 'bg-black border-[#ff0055] text-[#ff0055] hover:bg-[#ff0055] hover:text-black box-glow-red text-glow-red'
                    }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-lg">[TERMINATE]</span>
          </div>
        </button>
      </div>
    </div>
  );
};

/**
 * DialPad wrapped in React.memo to prevent unnecessary re-renders
 * 
 * Why this helps:
 * - Parent component (App) re-renders every second due to call duration timer
 * - Without memo, DialPad would re-render every second even though its props don't change
 * - React.memo performs shallow comparison of props and only re-renders if props actually change
 * - This significantly reduces CPU usage during active calls
 */
export default memo(DialPad);
