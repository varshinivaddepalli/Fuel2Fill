import { Composition, Folder } from 'remotion';
import './index.css';
import { PetroAstraPromo } from './PetroAstraPromo';
import { PromoSchema } from './schema';
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES, SCENE_DURATIONS } from './constants';
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

export const RemotionRoot = () => {
  return (
    <>
      {/* Main composition */}
      <Composition
        id="PetroAstraPromo"
        component={PetroAstraPromo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        schema={PromoSchema}
        defaultProps={{
          tagline: 'Ask. Analyze. Accelerate.',
          ctaText: 'Start your free trial today',
        }}
      />

      {/* Individual scene compositions for previewing */}
      <Folder name="Scenes">
        <Composition
          id="ColdOpen"
          component={ColdOpen}
          durationInFrames={SCENE_DURATIONS.COLD_OPEN}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="HeroDashboard"
          component={HeroDashboard}
          durationInFrames={SCENE_DURATIONS.HERO_DASHBOARD}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="AskAstraIntro"
          component={AskAstraIntro}
          durationInFrames={SCENE_DURATIONS.ASK_ASTRA_INTRO}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="AskAstraResults"
          component={AskAstraResults}
          durationInFrames={SCENE_DURATIONS.ASK_ASTRA_RESULTS}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="ClickAstra"
          component={ClickAstra}
          durationInFrames={SCENE_DURATIONS.CLICK_ASTRA}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Registration"
          component={Registration}
          durationInFrames={SCENE_DURATIONS.REGISTRATION}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Employee"
          component={Employee}
          durationInFrames={SCENE_DURATIONS.EMPLOYEE}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Operations"
          component={Operations}
          durationInFrames={SCENE_DURATIONS.OPERATIONS}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="TechStack"
          component={TechStack}
          durationInFrames={SCENE_DURATIONS.TECH_STACK}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
        <Composition
          id="Closing"
          component={Closing}
          durationInFrames={SCENE_DURATIONS.CLOSING}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
        />
      </Folder>
    </>
  );
};
