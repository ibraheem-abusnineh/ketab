import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LetterData } from '../../types';

interface SpyExercisePageProps {
  letterData: LetterData;
  selectedLetter: string;
  onComplete?: () => void;
  isEnglish?: boolean;
}

interface FoundObject {
  id: number;
  x: number;
  y: number;
  name: string;
  found: boolean;
}

const SpyExercisePage: React.FC<SpyExercisePageProps> = ({
  letterData,
  selectedLetter,
  onComplete,
  isEnglish = false
}) => {
  const [foundObjects, setFoundObjects] = useState<FoundObject[]>(
    (letterData.spyObjects || []).map((obj, index) => ({
      id: index,
      ...obj,
      found: false
    }))
  );

  const [lastFound, setLastFound] = useState<string | null>(null);

  const handleObjectClick = (id: number) => {
    setFoundObjects(prev =>
      prev.map(obj => {
        if (obj.id === id && !obj.found) {
          setLastFound(obj.name);
          setTimeout(() => setLastFound(null), 2000);
          return { ...obj, found: true };
        }
        return obj;
      })
    );
  };

  const handleReset = () => {
    setFoundObjects(prev => prev.map(obj => ({ ...obj, found: false })));
    setLastFound(null);
  };

  const allFound = foundObjects.length > 0 && foundObjects.every(obj => obj.found);

  return (
    <motion.div
      className="book-page active"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="spy-section">
        <h3>
          {isEnglish
            ? 'Find the objects that start with this letter:'
            : `أَبْحَثُ عَنِ الْأَشْيَاءِ الَّتِي تَبْدَأُ بِحَرْفِ (${letterData.name}):`}
        </h3>

        <div className="spy-container" style={{ position: 'relative', marginTop: '20px' }}>
          <div className="spy-image-wrapper" style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
            <img
              src={`${process.env.PUBLIC_URL}/letters/${selectedLetter.toLowerCase()}-spy.jpg`}
              alt="Spy game"
              style={{ width: '100%', display: 'block' }}
            />
            
            {foundObjects.map(obj => (
              <div
                key={obj.id}
                onClick={() => handleObjectClick(obj.id)}
                style={{
                  position: 'absolute',
                  left: `${obj.x}%`,
                  top: `${obj.y}%`,
                  width: '60px',
                  height: '60px',
                  transform: 'translate(-50%, -50%)',
                  cursor: obj.found ? 'default' : 'pointer',
                  borderRadius: '50%',
                  border: obj.found ? '4px solid #28a745' : '2px dashed transparent',
                  backgroundColor: obj.found ? 'rgba(40, 167, 69, 0.2)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10
                }}
              >
                {obj.found && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    style={{ fontSize: '24px' }}
                  >
                    ✅
                  </motion.span>
                )}
              </div>
            ))}
          </div>

          <AnimatePresence>
            {lastFound && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 20
                }}
              >
                {isEnglish ? `Found: ${lastFound}!` : `وجدت: ${lastFound}!`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="spy-status" style={{ marginTop: '20px', textAlign: 'center' }}>
          <div className="objects-to-find" style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            {foundObjects.map(obj => (
              <div
                key={obj.id}
                style={{
                  padding: '8px 15px',
                  borderRadius: '15px',
                  backgroundColor: obj.found ? '#28a745' : '#eee',
                  color: obj.found ? 'white' : '#666',
                  textDecoration: obj.found ? 'line-through' : 'none',
                  transition: 'all 0.3s ease',
                  fontSize: '0.9em'
                }}
              >
                {obj.name}
              </div>
            ))}
          </div>
          
          {allFound && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ marginTop: '20px', color: '#28a745', fontWeight: 'bold', fontSize: '1.2em' }}
            >
              {isEnglish ? '🌟 Excellent! You found all objects! 🌟' : '🌟 رائع! لقد وجدت جميع الأشياء! 🌟'}
            </motion.div>
          )}
        </div>
      </div>

      <div className="tracing-controls" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
        <button 
          type="button" 
          className="outline-btn" 
          onClick={handleReset}
          style={{
            padding: '10px 30px',
            borderRadius: '8px',
            border: '2px solid #84333c',
            background: 'white',
            color: '#84333c',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isEnglish ? 'Reset' : 'إعادة تعيين'}
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            if (onComplete) {
              onComplete();
            }
          }}
          style={{
            padding: '10px 40px',
            borderRadius: '8px',
            border: 'none',
            background: '#84333c',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {isEnglish ? 'Next' : 'التالي'}
        </button>
      </div>
    </motion.div>
  );
};

export default SpyExercisePage;
