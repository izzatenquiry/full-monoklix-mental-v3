import React from 'react';
import {
    styleOptions,
    lightingOptions,
    cameraOptions,
    compositionOptions,
    lensTypeOptions,
    filmSimOptions,
    effectOptions,
    vibeOptions,
    poseOptions,
    type CreativeDirectionState,
} from '../../services/creativeDirectionService';
import { type Language } from '../../types';

interface CreativeDirectionPanelProps {
    state: CreativeDirectionState;
    setState: React.Dispatch<React.SetStateAction<CreativeDirectionState>>;
    language: Language;
    showVibe?: boolean;
    showPose?: boolean;
    showEffect?: boolean;
    showAspectRatio?: boolean;
    // Props for integrating AI Settings (Image Count & Aspect Ratio)
    numberOfImages?: number;
    setNumberOfImages?: (val: number) => void;
    aspectRatio?: string;
    setAspectRatio?: (val: any) => void;
}

const SelectControl: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}> = ({ label, value, onChange, options }) => (
    <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-neutral-700 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
        >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

const CreativeDirectionPanel: React.FC<CreativeDirectionPanelProps> = ({ 
    state, 
    setState, 
    showVibe = true, 
    showPose = false, 
    showEffect = true,
    showAspectRatio = false,
    numberOfImages,
    setNumberOfImages,
    aspectRatio,
    setAspectRatio
}) => {
    
    const handleChange = (field: keyof CreativeDirectionState, value: string | number) => {
        setState(prevState => ({ ...prevState, [field]: value }));
    };

    return (
        <details className={`pt-4 border-t border-gray-200 dark:border-gray-700`} open>
            <summary className={`font-semibold cursor-pointer`}>Creative Direction & Settings</summary>
            <fieldset className="mt-4 space-y-4">
                {/* General AI Settings Section inside Creative Direction */}
                {(setNumberOfImages || setAspectRatio || showAspectRatio) && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700 mb-4">
                        {setNumberOfImages && numberOfImages !== undefined && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Image Count</label>
                                <select
                                    value={numberOfImages}
                                    onChange={(e) => setNumberOfImages(Number(e.target.value))}
                                    className="w-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                >
                                    {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Image{n > 1 ? 's' : ''}</option>)}
                                </select>
                            </div>
                        )}
                        {setAspectRatio && aspectRatio && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                                <select
                                    value={aspectRatio}
                                    onChange={(e) => setAspectRatio(e.target.value)}
                                    className="w-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                >
                                    {['9:16', '1:1', '16:9'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        )}
                        {!setAspectRatio && showAspectRatio && (
                            <div>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Aspect Ratio</label>
                                <select
                                    value={state.aspectRatio || '9:16'}
                                    onChange={(e) => handleChange('aspectRatio', e.target.value)}
                                    className="w-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                >
                                    {['9:16', '1:1', '16:9'].map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {showVibe && <SelectControl label="Background / Vibe" value={state.vibe} onChange={val => handleChange('vibe', val)} options={vibeOptions} />}
                    <SelectControl label="Artistic Style" value={state.style} onChange={val => handleChange('style', val)} options={styleOptions} />
                    <SelectControl label="Lighting" value={state.lighting} onChange={val => handleChange('lighting', val)} options={lightingOptions} />
                    <SelectControl label="Camera Shot" value={state.camera} onChange={val => handleChange('camera', val)} options={cameraOptions} />
                    {showPose && <SelectControl label="Body Pose" value={state.pose} onChange={val => handleChange('pose', val)} options={poseOptions} />}
                    <SelectControl label="Composition" value={state.composition} onChange={val => handleChange('composition', val)} options={compositionOptions} />
                    <SelectControl label="Lens Type" value={state.lensType} onChange={val => handleChange('lensType', val)} options={lensTypeOptions} />
                    <SelectControl label="Film Simulation" value={state.filmSim} onChange={val => handleChange('filmSim', val)} options={filmSimOptions} />
                    {showEffect && <SelectControl label="Visual Effect" value={state.effect} onChange={val => handleChange('effect', val)} options={effectOptions} />}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">AI Creativity Level ({state.creativityLevel})</label>
                    <input type="range" min="0" max="10" value={state.creativityLevel} onChange={(e) => handleChange('creativityLevel', Number(e.target.value))} className="w-full" />
                </div>
            </fieldset>
        </details>
    );
};

export default CreativeDirectionPanel;