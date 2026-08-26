import { Sequence, staticFile } from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { SCENE_DURATIONS, TRANSITION_DURATIONS } from './constants';
import type { PromoProps } from './schema';
import { ColdOpen } from './scenes/ColdOpen';
import { HeroDashboard } from './scenes/HeroDashboard';
import { AskAstraIntro } from './scenes/AskAstraIntro';
import { AskAstraResults } from './scenes/AskAstraResults';
import { ClickAstra } from './scenes/ClickAstra';
import { Registration } from './scenes/Registration';
import { Employee } from './scenes/Employee';
import { Operations } from './scenes/Operations';
import { TechStack } from './scenes/TechStack';
import { Closing } from './scenes/Closing';

/*
 * Scene start frames accounting for transition overlaps.
 * TransitionSeries overlaps adjacent scenes during transitions,
 * so each scene starts earlier than a simple sum.
 *
 * Scene 1:    0
 * Scene 2:  220  (240 - 20 fade)
 * Scene 3:  795  (220 + 600 - 25 slide)
 * Scene 4: 1585  (795 + 810 - 20 fade)
 * Scene 5: 2080  (1585 + 510 - 15 wipe)
 * Scene 6: 2655  (2080 + 600 - 25 slide)
 * Scene 7: 3235  (2655 + 600 - 20 fade)
 * Scene 8: 3810  (3235 + 600 - 25 slide)
 * Scene 9: 4480  (3810 + 690 - 20 fade)
 * Scene 10: 4750 (4480 + 300 - 30 slow fade)
 */
const SCENE_STARTS = {
  COLD_OPEN: 0,
  HERO_DASHBOARD: 220,
  ASK_ASTRA_INTRO: 795,
  ASK_ASTRA_RESULTS: 1585,
  CLICK_ASTRA: 2080,
  REGISTRATION: 2655,
  EMPLOYEE: 3235,
  OPERATIONS: 3810,
  TECH_STACK: 4480,
  CLOSING: 4750,
} as const;

export const PetroAstraPromo: React.FC<PromoProps> = () => {
  return (
    <>
      {/* Background music */}
      <Audio
        src={staticFile('music/background-ambient.mp3')}
        volume={0.15}
        loop
      />

      {/* Voiceover audio — placed OUTSIDE TransitionSeries to prevent
          overlap during transitions. Each plays at the scene's start frame. */}
      <Sequence from={SCENE_STARTS.COLD_OPEN} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/01-cold-open.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.HERO_DASHBOARD} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/02-hero-dashboard.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.ASK_ASTRA_INTRO} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/03-ask-astra-intro.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.ASK_ASTRA_RESULTS} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/04-ask-astra-results.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.CLICK_ASTRA} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/05-click-astra.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.REGISTRATION} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/06-registration.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.EMPLOYEE} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/07-employee.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.OPERATIONS} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/08-operations.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.TECH_STACK} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/09-tech-stack.mp3')} volume={0.9} />
      </Sequence>
      <Sequence from={SCENE_STARTS.CLOSING} layout="none">
        <Audio src={staticFile('voiceover/petro-astra-promo/10-closing.mp3')} volume={0.9} />
      </Sequence>

      {/* Scene visuals with transitions */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.COLD_OPEN}>
          <ColdOpen />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.HERO_DASHBOARD}>
          <HeroDashboard />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-right' })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.SLIDE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.ASK_ASTRA_INTRO}>
          <AskAstraIntro />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.ASK_ASTRA_RESULTS}>
          <AskAstraResults />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.WIPE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.CLICK_ASTRA}>
          <ClickAstra />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-bottom' })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.SLIDE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.REGISTRATION}>
          <Registration />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.EMPLOYEE}>
          <Employee />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={slide({ direction: 'from-left' })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.SLIDE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.OPERATIONS}>
          <Operations />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.TECH_STACK}>
          <TechStack />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATIONS.SLOW_FADE })}
        />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.CLOSING}>
          <Closing />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </>
  );
};
