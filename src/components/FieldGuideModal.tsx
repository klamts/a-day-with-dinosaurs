import React, { useState } from 'react';
import { DINOSAUR_CATALOG } from '../data/dinosaurs';
import { DinosaurDefinition } from '../types/game';
import { audioEngine } from '../audio/audioEngine';
import { speechEngine } from '../audio/speechEngine';
import {
  Volume2,
  X,
  Sparkles,
  Zap,
  Shield,
  BookOpen,
  Compass,
  Award,
  Mic,
  GraduationCap,
  HelpCircle
} from 'lucide-react';

interface FieldGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FieldGuideModal: React.FC<FieldGuideProps> = ({ isOpen, onClose }) => {
  const [selectedDino, setSelectedDino] = useState<DinosaurDefinition>(DINOSAUR_CATALOG[0]);
  const [filterCategory, setFilterCategory] = useState<'all' | 'slow' | 'medium' | 'fast' | 'apex'>('all');
  const [isSpeakingName, setIsSpeakingName] = useState(false);

  if (!isOpen) return null;

  const filteredDinos = filterCategory === 'all'
    ? DINOSAUR_CATALOG
    : DINOSAUR_CATALOG.filter(d => d.speedCategory === filterCategory);

  const handlePlayRoar = (dino: DinosaurDefinition) => {
    audioEngine.playRoar(dino.roarType);
  };

  const handlePronounce = (dino: DinosaurDefinition) => {
    setIsSpeakingName(true);
    speechEngine.pronounceDinosaur(dino.name, dino.phonetic);
    setTimeout(() => setIsSpeakingName(false), 1200);
  };

  const handleSpeakVocab = (tag: string) => {
    speechEngine.speak(tag);
  };

  return (
    <div id="field-guide-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/85 p-4 backdrop-blur-md select-none font-sans">
      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-8 border-white bg-green-700 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b-4 border-green-800 bg-green-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-green-950 border-2 border-yellow-300 shadow-md">
              <GraduationCap className="h-7 w-7 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                Dinosaur English & Paleontology Lab
              </h2>
              <p className="text-xs font-bold text-yellow-300">
                Learn dinosaur names in English, phonics pronunciation, vocabulary, and speeds!
              </p>
            </div>
          </div>
          <button
            id="close-field-guide-btn"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-green-950 hover:bg-yellow-300 font-black shadow-lg border-2 border-white"
          >
            <X className="h-6 w-6 stroke-[3]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Left: Dinosaur List & Category Tabs */}
          <div className="flex w-full flex-col border-b-4 border-green-800 md:w-80 md:border-b-0 md:border-r-4">
            {/* Filter Tabs */}
            <div className="flex border-b-2 border-green-800 bg-green-800/80 p-2 gap-1.5 overflow-x-auto text-xs font-black uppercase">
              {(['all', 'slow', 'medium', 'fast', 'apex'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 transition-all border-2 ${
                    filterCategory === cat
                      ? 'bg-yellow-400 border-yellow-300 text-green-950 shadow-md scale-105'
                      : 'bg-green-700 border-green-600 text-green-100 hover:bg-green-600'
                  }`}
                >
                  {cat === 'all' ? 'All (11)' : cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-green-800/40">
              {filteredDinos.map(dino => {
                const isSelected = dino.id === selectedDino.id;
                return (
                  <div
                    key={dino.id}
                    id={`guide-item-${dino.id}`}
                    onClick={() => {
                      setSelectedDino(dino);
                      handlePronounce(dino);
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border-4 p-3 transition-all ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400 text-green-950 shadow-lg scale-102 font-black'
                        : 'border-white/20 bg-green-700/80 text-white hover:border-white/50 hover:bg-green-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center font-black text-white shadow border-2 border-white text-lg"
                        style={{ backgroundColor: dino.primaryColor }}
                      >
                        {dino.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase flex items-center gap-1.5">
                          <span>{dino.name}</span>
                          <span className="text-xs">{dino.dietEmoji || '🌿'}</span>
                        </div>
                        <div className={`text-[11px] font-bold capitalize ${isSelected ? 'text-green-900' : 'text-green-200'}`}>
                          {dino.speedCategory} • {dino.diet}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-black shadow ${
                        dino.speedCategory === 'apex' || dino.speedCategory === 'fast'
                          ? 'bg-rose-500 text-white'
                          : 'bg-orange-500 text-white'
                      }`}>
                        +{dino.points} PTS
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Dinosaur Deep Dive & Interactive Phonics/Audio */}
          <div className="flex flex-1 flex-col overflow-y-auto p-6 bg-green-700">
            {/* Dinosaur Profile Card */}
            <div className="relative overflow-hidden rounded-3xl border-4 border-white bg-sky-300 p-6 text-green-950 shadow-xl">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-3xl text-4xl shadow-xl border-4 border-white shrink-0"
                    style={{ backgroundColor: selectedDino.primaryColor }}
                  >
                    🦖
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-green-950">
                        {selectedDino.name}
                      </h3>
                      <span className="rounded-full bg-green-900 text-yellow-300 px-3 py-0.5 text-xs font-black uppercase">
                        {selectedDino.speedCategory} speed
                      </span>
                    </div>
                    {/* Phonics Syllables Guide for Kids */}
                    {selectedDino.phonetic && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-black bg-white/80 px-2 py-0.5 rounded-md text-green-950 border border-green-900/20">
                          🗣️ Phonics: <span className="text-orange-600 font-mono">{selectedDino.phonetic}</span>
                        </span>
                      </div>
                    )}
                    <p className="mt-0.5 text-xs font-bold text-green-900 italic">
                      "{selectedDino.scientificName}" • Meaning: {selectedDino.nameMeaning || selectedDino.name}
                    </p>
                  </div>
                </div>

                {/* Audio Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="pronounce-dino-btn"
                    onClick={() => handlePronounce(selectedDino)}
                    className="flex items-center gap-2 rounded-2xl border-4 border-blue-600 bg-blue-500 px-4 py-2.5 text-xs md:text-sm font-black uppercase text-white shadow-xl hover:bg-blue-400 active:scale-95 transition-transform"
                  >
                    <Mic className="h-4 w-4 stroke-[3]" />
                    <span>{isSpeakingName ? 'Speaking...' : 'Pronounce in English'}</span>
                  </button>

                  <button
                    id="play-dino-roar-btn"
                    onClick={() => handlePlayRoar(selectedDino)}
                    className="flex items-center gap-2 rounded-2xl border-4 border-orange-600 bg-orange-500 px-4 py-2.5 text-xs md:text-sm font-black uppercase text-white shadow-xl hover:bg-orange-400 active:scale-95 transition-transform"
                  >
                    <Volume2 className="h-4 w-4 stroke-[3]" />
                    <span>Roar Sound</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-white/85 p-3 text-center border-2 border-green-900/20 shadow-sm">
                  <div className="text-[10px] font-black uppercase text-green-800">Speed Rating</div>
                  <div className="text-lg font-black uppercase text-green-950">{selectedDino.baseSpeed}x mph</div>
                </div>
                <div className="rounded-2xl bg-white/85 p-3 text-center border-2 border-green-900/20 shadow-sm">
                  <div className="text-[10px] font-black uppercase text-green-800">Points Value</div>
                  <div className="text-lg font-black text-orange-600">+{selectedDino.points} PTS</div>
                </div>
                <div className="rounded-2xl bg-white/85 p-3 text-center border-2 border-green-900/20 shadow-sm">
                  <div className="text-[10px] font-black uppercase text-green-800">Diet Type</div>
                  <div className="text-lg font-black capitalize text-green-950 flex items-center justify-center gap-1">
                    <span>{selectedDino.dietEmoji || '🌿'}</span>
                    <span>{selectedDino.diet}</span>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/85 p-3 text-center border-2 border-green-900/20 shadow-sm">
                  <div className="text-[10px] font-black uppercase text-green-800">Length</div>
                  <div className="text-lg font-black text-green-950">{selectedDino.lengthMeters || selectedDino.sizeMeters}m</div>
                </div>
              </div>

              {/* English Vocabulary Tags for Kids */}
              {selectedDino.vocabTags && selectedDino.vocabTags.length > 0 && (
                <div className="mt-4 rounded-2xl bg-white/90 p-3.5 border-2 border-green-900/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs font-black uppercase text-green-950 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-orange-600" />
                      English Vocabulary Flashcards (Click to Listen):
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedDino.vocabTags.map((tag, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSpeakVocab(tag)}
                        className="flex items-center gap-1.5 bg-yellow-400/90 hover:bg-yellow-300 text-green-950 font-black text-xs px-3 py-1 rounded-xl border border-yellow-500 shadow-sm transition-all hover:scale-105 active:scale-95"
                      >
                        <Volume2 className="h-3 w-3" />
                        <span>{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Kid-Friendly Dinosaur Facts */}
              <div className="mt-3.5 rounded-2xl bg-white/95 p-4 border-2 border-green-900/20">
                <h4 className="text-xs font-black uppercase text-green-900">🌟 Fun Paleontology Fact:</h4>
                <p className="mt-1 text-sm font-bold leading-relaxed text-green-950">
                  {selectedDino.funFact || selectedDino.fact}
                </p>
                {selectedDino.kidFact && (
                  <p className="mt-2 text-xs font-semibold text-green-800 bg-green-100 p-2 rounded-xl border border-green-300">
                    💡 <strong>Kids Fact:</strong> {selectedDino.kidFact}
                  </p>
                )}
                {selectedDino.roarDescription && (
                  <div className="mt-2 text-xs font-semibold text-green-800">
                    <span className="font-black">Roar Sound Profile:</span> {selectedDino.roarDescription}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
