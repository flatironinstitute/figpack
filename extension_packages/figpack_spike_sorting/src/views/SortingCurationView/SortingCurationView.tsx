import { FunctionComponent, useCallback, useMemo, useState } from "react";
import { useSortingCuration } from "../context-sorting-curation/SortingCurationContext";
import { useSelectedUnitIds } from "../context-unit-selection";

type Props = {
    defaultLabelOptions: string[];
    width: number;
    height: number;
};

type LabelSelectionState = 'none' | 'partial' | 'full';

const SortingCurationView: FunctionComponent<Props> = ({
    defaultLabelOptions,
    width,
    height
}) => {
    const { selectedUnitIdsArray } = useSelectedUnitIds();
    const { sortingCuration, sortingCurationDispatch } = useSortingCuration();
    const { labelChoices = [], labelsByUnit = {}, mergeGroups = [], isClosed = false } = sortingCuration;

    const [newLabelInput, setNewLabelInput] = useState("");
    const [showLabelChoices, setShowLabelChoices] = useState(false);

    // Initialize label choices with default options if empty
    const effectiveLabelChoices = useMemo(() => {
        if (labelChoices.length === 0 && defaultLabelOptions.length > 0) {
            // Initialize with default options
            sortingCurationDispatch({
                type: "SET_LABEL_CHOICES",
                labelChoices: defaultLabelOptions
            });
            return defaultLabelOptions;
        }
        return labelChoices;
    }, [labelChoices, defaultLabelOptions, sortingCurationDispatch]);

    // Calculate label selection state for each label
    const getLabelSelectionState = useCallback((label: string): LabelSelectionState => {
        if (selectedUnitIdsArray.length === 0) return 'none';
        
        const unitsWithLabel = selectedUnitIdsArray.filter(unitId => 
            (labelsByUnit[unitId.toString()] || []).includes(label)
        );
        
        if (unitsWithLabel.length === 0) return 'none';
        if (unitsWithLabel.length === selectedUnitIdsArray.length) return 'full';
        return 'partial';
    }, [selectedUnitIdsArray, labelsByUnit]);

    // Handle label toggle
    const handleLabelToggle = useCallback((label: string) => {
        if (selectedUnitIdsArray.length === 0 || isClosed) return;
        
        sortingCurationDispatch({
            type: "TOGGLE_UNIT_LABEL",
            unitId: selectedUnitIdsArray,
            label
        });
    }, [selectedUnitIdsArray, isClosed, sortingCurationDispatch]);

    // Handle adding new label choice
    const handleAddLabelChoice = useCallback(() => {
        const trimmedLabel = newLabelInput.trim();
        if (trimmedLabel && !effectiveLabelChoices.includes(trimmedLabel)) {
            sortingCurationDispatch({
                type: "SET_LABEL_CHOICES",
                labelChoices: [...effectiveLabelChoices, trimmedLabel]
            });
            setNewLabelInput("");
        }
    }, [newLabelInput, effectiveLabelChoices, sortingCurationDispatch]);

    // Check if a label is being used by any units
    const isLabelInUse = useCallback((label: string): boolean => {
        return Object.values(labelsByUnit).some(labels => labels.includes(label));
    }, [labelsByUnit]);

    // Handle removing label choice
    const handleRemoveLabelChoice = useCallback((labelToRemove: string) => {
        if (isLabelInUse(labelToRemove)) {
            return; // Don't remove if label is in use
        }
        sortingCurationDispatch({
            type: "SET_LABEL_CHOICES",
            labelChoices: effectiveLabelChoices.filter(label => label !== labelToRemove)
        });
    }, [effectiveLabelChoices, sortingCurationDispatch, isLabelInUse]);

    // Merge group helper functions
    const findMergeGroupForUnit = useCallback((unitId: number | string): (number | string)[] | undefined => {
        return mergeGroups.find(group => group.includes(unitId));
    }, [mergeGroups]);

    const getSelectedUnitsMergeStatus = useMemo(() => {
        if (selectedUnitIdsArray.length === 0) {
            return { canMerge: false, canUnmerge: false, groupsInvolved: [], unmergedUnits: [] };
        }

        const groupsInvolved = new Set<(number | string)[]>();
        const unmergedUnits: (number | string)[] = [];

        selectedUnitIdsArray.forEach(unitId => {
            const group = findMergeGroupForUnit(unitId);
            if (group) {
                groupsInvolved.add(group);
            } else {
                unmergedUnits.push(unitId);
            }
        });

        const canMerge = selectedUnitIdsArray.length >= 2;
        const canUnmerge = groupsInvolved.size > 0;

        return {
            canMerge,
            canUnmerge,
            groupsInvolved: Array.from(groupsInvolved),
            unmergedUnits
        };
    }, [selectedUnitIdsArray, findMergeGroupForUnit]);

    // Handle merge units
    const handleMergeUnits = useCallback(() => {
        if (selectedUnitIdsArray.length < 2 || isClosed) return;
        
        sortingCurationDispatch({
            type: "MERGE_UNITS",
            unitIds: selectedUnitIdsArray
        });
    }, [selectedUnitIdsArray, isClosed, sortingCurationDispatch]);

    // Handle unmerge units
    const handleUnmergeUnits = useCallback(() => {
        if (selectedUnitIdsArray.length === 0 || isClosed) return;
        
        sortingCurationDispatch({
            type: "UNMERGE_UNITS",
            unitIds: selectedUnitIdsArray
        });
    }, [selectedUnitIdsArray, isClosed, sortingCurationDispatch]);

    // Handle curation finalization
    const handleToggleCurationStatus = useCallback(() => {
        if (isClosed) {
            sortingCurationDispatch({ type: "REOPEN_CURATION" });
        } else {
            sortingCurationDispatch({ type: "CLOSE_CURATION" });
        }
    }, [isClosed, sortingCurationDispatch]);

    // Format selected units display
    const selectedUnitsDisplay = useMemo(() => {
        if (selectedUnitIdsArray.length === 0) return "No units selected";
        if (selectedUnitIdsArray.length <= 5) {
            return `Units: ${selectedUnitIdsArray.join(", ")}`;
        }
        return `${selectedUnitIdsArray.length} units selected`;
    }, [selectedUnitIdsArray]);

    const containerStyle: React.CSSProperties = {
        width,
        height,
        padding: "8px",
        fontSize: "12px",
        fontFamily: "Arial, sans-serif",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fafafa",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    };

    const sectionStyle: React.CSSProperties = {
        marginBottom: "6px"
    };

    const labelStyle: React.CSSProperties = {
        fontWeight: "bold",
        marginBottom: "4px",
        fontSize: "11px",
        color: "#333"
    };

    const chipStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 6px",
        margin: "2px",
        backgroundColor: "#e0e0e0",
        borderRadius: "12px",
        fontSize: "10px",
        border: "1px solid #ccc"
    };

    const removeButtonStyle: React.CSSProperties = {
        marginLeft: "4px",
        cursor: "pointer",
        color: "#666",
        fontWeight: "bold"
    };

    const inputStyle: React.CSSProperties = {
        padding: "2px 4px",
        fontSize: "10px",
        border: "1px solid #ccc",
        borderRadius: "2px",
        marginRight: "4px",
        flex: 1
    };

    const buttonStyle: React.CSSProperties = {
        padding: "2px 6px",
        fontSize: "10px",
        border: "1px solid #ccc",
        borderRadius: "2px",
        backgroundColor: "#f0f0f0",
        cursor: "pointer"
    };

    const checkboxContainerStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        margin: "2px 8px 2px 0",
        cursor: selectedUnitIdsArray.length > 0 && !isClosed ? "pointer" : "default",
        opacity: selectedUnitIdsArray.length > 0 && !isClosed ? 1 : 0.5
    };

    const statusStyle: React.CSSProperties = {
        ...sectionStyle,
        textAlign: "center"
    };

    const statusButtonStyle: React.CSSProperties = {
        ...buttonStyle,
        backgroundColor: isClosed ? "#f8d7da" : "#d4edda",
        borderColor: isClosed ? "#f5c6cb" : "#c3e6cb",
        color: isClosed ? "#721c24" : "#155724"
    };

    const expanderStyle: React.CSSProperties = {
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        fontSize: "11px",
        fontWeight: "bold",
        color: "#333",
        marginBottom: "4px"
    };

    const expanderArrowStyle: React.CSSProperties = {
        marginRight: "4px",
        fontSize: "10px",
        transform: showLabelChoices ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.2s"
    };

    return (
        <div style={containerStyle}>
            {/* Selected Units Display */}
            <div style={sectionStyle}>
                <div style={labelStyle}>Selected Units</div>
                <div style={{ fontSize: "10px", color: "#666" }}>
                    {selectedUnitsDisplay}
                </div>
            </div>

            {/* Label Assignment */}
            <div style={sectionStyle}>
                <div style={labelStyle}>Label Assignment</div>
                {effectiveLabelChoices.map(label => {
                    const selectionState = getLabelSelectionState(label);
                    return (
                        <div 
                            key={label} 
                            style={checkboxContainerStyle}
                            onClick={() => handleLabelToggle(label)}
                        >
                            <input
                                type="checkbox"
                                checked={selectionState === 'full'}
                                ref={(input) => {
                                    if (input) {
                                        input.indeterminate = selectionState === 'partial';
                                    }
                                }}
                                onChange={() => {}} // Handled by onClick on container
                                style={{ marginRight: "4px" }}
                                disabled={selectedUnitIdsArray.length === 0 || isClosed}
                            />
                            <span style={{ fontSize: "10px" }}>{label}</span>
                        </div>
                    );
                })}
                {selectedUnitIdsArray.length === 0 && (
                    <div style={{ fontSize: "10px", color: "#999", fontStyle: "italic" }}>
                        Select units to assign labels
                    </div>
                )}
            </div>

            {/* Unit Merging */}
            <div style={sectionStyle}>
                <div style={labelStyle}>Unit Merging</div>
                
                {/* Display existing merge groups that involve selected units */}
                {selectedUnitIdsArray.length > 0 && getSelectedUnitsMergeStatus.groupsInvolved.length > 0 && (
                    <div style={{ marginBottom: "6px" }}>
                        <div style={{ fontSize: "10px", color: "#666", marginBottom: "2px" }}>
                            Merge groups involving selected units:
                        </div>
                        {getSelectedUnitsMergeStatus.groupsInvolved.map((group, index) => {
                            const groupChipStyle: React.CSSProperties = {
                                ...chipStyle,
                                backgroundColor: "#e3f2fd",
                                borderColor: "#90caf9",
                                color: "#1565c0"
                            };
                            return (
                                <span key={index} style={groupChipStyle}>
                                    {group.join(", ")}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Merge/Unmerge controls */}
                <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                    <button
                        onClick={handleMergeUnits}
                        style={{
                            ...buttonStyle,
                            backgroundColor: getSelectedUnitsMergeStatus.canMerge && !isClosed ? "#d4edda" : "#f8f9fa",
                            borderColor: getSelectedUnitsMergeStatus.canMerge && !isClosed ? "#c3e6cb" : "#dee2e6",
                            color: getSelectedUnitsMergeStatus.canMerge && !isClosed ? "#155724" : "#6c757d",
                            cursor: getSelectedUnitsMergeStatus.canMerge && !isClosed ? "pointer" : "default"
                        }}
                        disabled={!getSelectedUnitsMergeStatus.canMerge || isClosed}
                        title={
                            isClosed ? "Cannot merge when curation is closed" :
                            selectedUnitIdsArray.length < 2 ? "Select 2 or more units to merge" :
                            "Merge selected units"
                        }
                    >
                        Merge Selected
                    </button>
                    
                    <button
                        onClick={handleUnmergeUnits}
                        style={{
                            ...buttonStyle,
                            backgroundColor: getSelectedUnitsMergeStatus.canUnmerge && !isClosed ? "#fff3cd" : "#f8f9fa",
                            borderColor: getSelectedUnitsMergeStatus.canUnmerge && !isClosed ? "#ffeaa7" : "#dee2e6",
                            color: getSelectedUnitsMergeStatus.canUnmerge && !isClosed ? "#856404" : "#6c757d",
                            cursor: getSelectedUnitsMergeStatus.canUnmerge && !isClosed ? "pointer" : "default"
                        }}
                        disabled={!getSelectedUnitsMergeStatus.canUnmerge || isClosed}
                        title={
                            isClosed ? "Cannot unmerge when curation is closed" :
                            !getSelectedUnitsMergeStatus.canUnmerge ? "Select units that are part of merge groups to unmerge" :
                            "Unmerge selected units"
                        }
                    >
                        Unmerge Selected
                    </button>
                </div>

                {/* Status display for selected units */}
                {selectedUnitIdsArray.length > 0 && (
                    <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                        {getSelectedUnitsMergeStatus.groupsInvolved.length > 0 && (
                            <div>
                                Selected units in {getSelectedUnitsMergeStatus.groupsInvolved.length} merge group(s)
                            </div>
                        )}
                        {getSelectedUnitsMergeStatus.unmergedUnits.length > 0 && (
                            <div>
                                {getSelectedUnitsMergeStatus.unmergedUnits.length} unmerged unit(s) selected
                            </div>
                        )}
                    </div>
                )}

                {selectedUnitIdsArray.length === 0 && (
                    <div style={{ fontSize: "10px", color: "#999", fontStyle: "italic", marginTop: "4px" }}>
                        Select units to merge or unmerge
                    </div>
                )}
            </div>

            {/* Label Choices Management - Expandable */}
            <div style={sectionStyle}>
                <div 
                    style={expanderStyle}
                    onClick={() => setShowLabelChoices(!showLabelChoices)}
                >
                    <span style={expanderArrowStyle}>▶</span>
                    Manage Label Choices
                </div>
                {showLabelChoices && (
                    <div>
                        <div style={{ marginBottom: "4px" }}>
                            {effectiveLabelChoices.map(label => {
                                const labelInUse = isLabelInUse(label);
                                return (
                                    <span key={label} style={chipStyle}>
                                        {label}
                                        {!isClosed && !labelInUse && (
                                            <span 
                                                style={removeButtonStyle}
                                                onClick={() => handleRemoveLabelChoice(label)}
                                                title="Remove label choice"
                                            >
                                                ×
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                        {!isClosed && (
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <input
                                    type="text"
                                    value={newLabelInput}
                                    onChange={(e) => setNewLabelInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddLabelChoice()}
                                    placeholder="Add label..."
                                    style={inputStyle}
                                />
                                <button 
                                    onClick={handleAddLabelChoice}
                                    style={buttonStyle}
                                    disabled={!newLabelInput.trim()}
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Curation Status */}
            <div style={statusStyle}>
                <button 
                    onClick={handleToggleCurationStatus}
                    style={statusButtonStyle}
                >
                    {isClosed ? "Reopen Curation" : "Finalize Curation"}
                </button>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "2px" }}>
                    Status: {isClosed ? "Closed" : "Open"}
                </div>
            </div>
        </div>
    );
};

export default SortingCurationView;
