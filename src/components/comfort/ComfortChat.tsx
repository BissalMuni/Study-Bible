/**
 * ComfortChat — 감정 분기형 마인드 체크(위안) 설문
 *
 * ── 적용 심리이론 ──────────────────────────────────────────────────────────
 *
 * [Q1] 감정 분류 — Plutchik(1980) 기본 감정 분류 + 혼합 감정 개념
 *   기쁨(joy), 분노(anger), 슬픔(sorrow), 즐거움(pleasure), 사랑(love),
 *   미움(hate), 욕망(desire)을 category(positive/negative/neutral)로 구분
 *   → 이후 질문 분기를 결정하는 핵심 축
 *
 * [Q2] 원인 탐색 — 인지행동치료(CBT, Beck 1979)
 *   상황-생각-감정-행동(STBA) 모델 중 '상황(Situation)' 탐색
 *   어떤 맥락에서 감정이 촉발되었는지 확인 → 태그 수집 정밀화
 *
 * [Q3] 내면 목소리 탐색 (negative 분기) — 2025-07 개선
 *   ▸ CBT(Beck): 자동적 사고(Automatic Thoughts) · 인지왜곡 패턴 식별
 *     - 학습된 무력감(Seligman), 반추(Nolen-Hoeksema), 파국화, 자기귀인 오류
 *   ▸ 정서조절(Gross 2015): 억압(Suppression) vs 재평가(Reappraisal)
 *   ▸ 애착이론(Bowlby): 연결 욕구 좌절 → 정서적 고립감
 *   → 표면적 상황이 아닌 "마음속 생각 패턴"을 탐색해 구절 매핑 정확도 향상
 *
 * [Q4] 내면 자원 탐색 (negative 분기) — 2025-07 개선
 *   ▸ ACT(Hayes 2004): 심리적 유연성 · 가치 기반 행동(Committed Action)
 *   ▸ Neff 자기연민(Self-Compassion): 자기 수용 · 공통 인간성
 *   ▸ 긍정심리학(Seligman PERMA): 회복탄력성(Resilience) · 희망 이론(Snyder)
 *   ▸ 애착이론(Bowlby): 안전 기지(Secure Base) 탐색
 *   → '무엇이 없는지'가 아닌 '어떤 내면 자원이 필요한지'로 질문 전환
 *
 * 참고문헌:
 *   Beck, A.T. (1979). Cognitive Therapy of Depression.
 *   Gross, J.J. (2015). Emotion regulation: Current status and future prospects.
 *   Hayes, S.C. (2004). Acceptance and Commitment Therapy.
 *   Bowlby, J. (1988). A Secure Base.
 *   Neff, K. (2011). Self-Compassion: The Proven Power of Being Kind to Yourself.
 *   Seligman, M.E.P. (2011). Flourish (PERMA model).
 *   Snyder, C.R. (1994). The Psychology of Hope.
 *   Nolen-Hoeksema, S. (1991). Responses to depression and their effects on duration.
 * ────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Heart, RefreshCw } from 'lucide-react';
import { ComfortResult } from './ComfortResult';
import { useAdContext } from '../../contexts/AdContext';
import { selectVersesByTags } from './selectVerses';

interface Option {
  id: string;
  text: string;
  tags: string[];
  category?: 'positive' | 'negative' | 'neutral';
}

interface Question {
  id: number;
  question: string;
  type: string;
  options: Option[];
}

interface Verse {
  id: number;
  reference: string;
  text: string;
  tags: string[];
  priority?: number; // 1=최고연관 (수기 큐레이션). 스코어 가산점에 반영.
  reason?: string;   // 이 구절이 위로가 되는 이유 (결과 화면 노출).
}

interface EncouragementMessage {
  message: string;
  closing: string;
}

interface ComfortData {
  questions: {
    q1: Question;
    q2: Record<string, Question>;
    q3: Record<string, Question>;
    q4: Record<string, Question>;
  };
  verses: Verse[];
  tagDescriptions: Record<string, string>;
  encouragementMessages: Record<string, EncouragementMessage>;
}

interface AnswerState {
  option: Option;
  questionId: number;
  questionText: string;
}

interface QuestionSummary {
  question: string;
  answer: string;
}

export const ComfortChat: React.FC = () => {
  const { triggerAd } = useAdContext();
  const [data, setData] = useState<ComfortData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [showResult, setShowResult] = useState(false);
  const [recommendedVerses, setRecommendedVerses] = useState<Verse[]>([]);
  const [collectedTags, setCollectedTags] = useState<string[]>([]);
  const [questionSummary, setQuestionSummary] = useState<QuestionSummary[]>([]);

  // 1번 질문 답변의 category (positive, negative, neutral)
  const [emotionCategory, setEmotionCategory] = useState<'positive' | 'negative' | 'neutral' | null>(null);
  // 1번 질문 답변의 id (joy, anger, sorrow, etc.)
  const [emotionType, setEmotionType] = useState<string | null>(null);
  // 최초 결과 산출에 쓰인 "원시 태그"(중복 포함). '새 말씀 보기'가 빈도 가중치를
  // 보존하도록 재사용한다(dedup된 collectedTags를 쓰면 가중치가 소실됨).
  const rawTagsRef = useRef<string[]>([]);

  useEffect(() => {
    // Load questions/messages and verses separately
    Promise.all([
      fetch('/data/comfort-verses.json').then(res => res.json()),
      fetch('/data/comfort-verses-data.json').then(res => res.json())
    ])
      .then(([mainData, versesData]) => {
        setData({
          ...mainData,
          verses: versesData
        });
      })
      .catch(console.error);
  }, []);

  // 현재 단계에 맞는 질문 가져오기
  const getCurrentQuestion = (): Question | null => {
    if (!data) return null;

    switch (currentStep) {
      case 0:
        return data.questions.q1;
      case 1:
        if (!emotionType) return null;
        return data.questions.q2[emotionType] || null;
      case 2:
        if (!emotionCategory) return null;
        return data.questions.q3[emotionCategory] || null;
      case 3:
        if (!emotionCategory) return null;
        return data.questions.q4[emotionCategory] || null;
      default:
        return null;
    }
  };

  const handleSelectOption = (option: Option) => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    // 답변 저장
    setAnswers(prev => ({
      ...prev,
      [currentStep]: { option, questionId: currentQuestion.id, questionText: currentQuestion.question }
    }));

    // 1번 질문이면 category와 emotion type 저장
    if (currentStep === 0) {
      setEmotionCategory(option.category || 'neutral');
      setEmotionType(option.id);
    }

    // 자동으로 다음 질문으로 이동
    if (currentStep < 3) {
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 300);
    } else {
      // 마지막 질문이면 결과 계산
      setTimeout(() => {
        calculateResultWithAnswer(option, currentQuestion);
      }, 300);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      calculateResult();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateResultWithAnswer = (lastAnswer: Option, currentQuestion: Question) => {
    if (!data) return;

    // 마지막 답변을 포함한 최종 answers 객체 생성
    const finalAnswers = {
      ...answers,
      [currentStep]: { option: lastAnswer, questionId: currentQuestion.id, questionText: currentQuestion.question }
    };

    // 모든 이전 답변의 태그 수집
    const allTags: string[] = [];
    Object.values(finalAnswers).forEach(answer => {
      if (answer?.option?.tags) {
        allTags.push(...answer.option.tags);
      }
    });

    processTagsAndShowResult(allTags, finalAnswers);
  };

  const processTagsAndShowResult = (allTags: string[], finalAnswers: Record<number, AnswerState>) => {
    if (!data) return;

    // 결과 표시 전 광고 확률적 표시
    triggerAd('COMFORT_RESULT');

    // 질문 요약 생성
    const summary: QuestionSummary[] = [];
    for (let i = 0; i <= 3; i++) {
      const answer = finalAnswers[i];
      if (answer) {
        summary.push({
          question: answer.questionText,
          answer: answer.option.text
        });
      }
    }
    setQuestionSummary(summary);

    // 원시 태그를 보존해 '새 말씀 보기'가 동일한 빈도 가중치로 재선택하도록 한다.
    rawTagsRef.current = allTags;
    const { verses: topVerses, sortedTags } = selectVersesByTags(data.verses, allTags);

    setCollectedTags(sortedTags);
    setRecommendedVerses(topVerses);
    setShowResult(true);
  };

  const calculateResult = () => {
    if (!data) return;

    // Collect all tags from answers
    const allTags: string[] = [];
    Object.values(answers).forEach(answer => {
      if (answer?.option?.tags) {
        allTags.push(...answer.option.tags);
      }
    });

    processTagsAndShowResult(allTags, answers);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
    setRecommendedVerses([]);
    setCollectedTags([]);
    setQuestionSummary([]);
    setEmotionCategory(null);
    setEmotionType(null);
  };

  // 새 말씀 보기 - 최초 결과와 동일한 원시 태그(빈도 가중치 보존)로 재선택.
  // 이전엔 dedup된 collectedTags를 써서 결과 화면과 랭킹 기준이 달라지는 버그가 있었다.
  const handleNewVerse = () => {
    if (!data || collectedTags.length === 0) return;
    const { verses } = selectVersesByTags(data.verses, rawTagsRef.current);
    setRecommendedVerses(verses);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-8 h-8 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  if (showResult) {
    return (
      <ComfortResult
        verses={recommendedVerses}
        tags={collectedTags}
        tagDescriptions={data.tagDescriptions}
        encouragementMessages={data.encouragementMessages}
        questionSummary={questionSummary}
        onRestart={handleRestart}
        onNewVerse={handleNewVerse}
      />
    );
  }

  const currentQuestion = getCurrentQuestion();

  // 질문을 가져올 수 없는 경우 (1번 질문 미선택 상태에서 2번으로 이동 등)
  if (!currentQuestion) {
    // 이전 단계로 돌아가기
    if (currentStep > 0) {
      setCurrentStep(0);
    }
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-8 h-8 text-blue-500" />
        </motion.div>
      </div>
    );
  }

  const selectedOption = answers[currentStep]?.option;

  return (
    <div className="min-h-full bg-gradient-to-b from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 px-4 py-6">
      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6"
        >
          {/* Question Header with Icon */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleSelectOption(option)}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedOption?.id === option.id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-base">{option.text}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${
            currentStep === 0
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          이전
        </motion.button>
        {currentStep === 3 ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={calculateResult}
            className="flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white"
          >
            결과 보기
            <Heart className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleNext}
            disabled={currentStep === 0 && !emotionType}
            className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 ${
              currentStep === 0 && !emotionType
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            다음
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </div>

      {/* Encouragement Message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6"
      >
        당신의 마음을 이해하고 싶어요 💝
      </motion.p>
    </div>
  );
};
