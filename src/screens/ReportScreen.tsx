import { useCallback, useState } from 'react';
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OutlineButton, PrimaryButton } from '../components/Buttons';
import { TextField } from '../components/TextField';
import { detectPotholes, mapYoloToDraft } from '../api/detect';
import { consumeFormReset } from '../data/reportStore';
import {
    roadTypeLabels,
    roadTypes,
    type GeoCoords,
    type RoadType,
} from '../models/report';
import { ScreenContainer } from '../layout/ScreenContainer';
import { useBreakpoint } from '../layout/useBreakpoint';
import { webCursor, type WebPressableState } from '../layout/webStyles';
import type { RootStackParamList, UserTabParamList } from '../navigation';
import { colors, radii } from '../theme';

type Props = CompositeScreenProps<
    BottomTabScreenProps<UserTabParamList, 'Report'>,
    NativeStackScreenProps<RootStackParamList>
>;

const dummyLocation = {
    address: 'Gulberg III, near Main Boulevard',
    coords: { lat: 31.5204, lng: 74.3587 } satisfies GeoCoords,
};

export function ReportScreen({ navigation }: Props) {
    const { isWide } = useBreakpoint();
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [city, setCity] = useState('');
    const [area, setArea] = useState('');
    const [roadType, setRoadType] = useState<RoadType>('localRoad');
    const [useGps, setUseGps] = useState(false);
    const [address, setAddress] = useState('');
    const [coords, setCoords] = useState<GeoCoords | undefined>();
    const [locating, setLocating] = useState(false);
    const [description, setDescription] = useState('');
    const [landmark, setLandmark] = useState('');
    const [sheetOpen, setSheetOpen] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [errors, setErrors] = useState<{
        city?: string;
        area?: string;
        address?: string;
    }>({});

    const resetForm = () => {
        setPhotoUri(null);
        setCity('');
        setArea('');
        setRoadType('localRoad');
        setUseGps(false);
        setAddress('');
        setCoords(undefined);
        setDescription('');
        setLandmark('');
        setErrors({});
    };

    useFocusEffect(
        useCallback(() => {
            if (consumeFormReset()) resetForm();
        }, []),
    );

    const pick = async (source: 'camera' | 'gallery') => {
        setSheetOpen(false);
        try {
            if (source === 'camera') {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) {
                    Alert.alert('Camera needed', 'Allow camera access to photograph potholes.');
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    quality: 0.8,
                    allowsEditing: false,
                });
                if (!result.canceled && result.assets[0]) {
                    setPhotoUri(result.assets[0].uri);
                }
                return;
            }

            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Photos needed', 'Allow photo library access to upload a pothole image.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                quality: 0.8,
                mediaTypes: ['images'],
            });
            if (!result.canceled && result.assets[0]) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch {
            Alert.alert('Could not open the camera or gallery.');
        }
    };

    const applyDummyLocation = () => {
        setUseGps(true);
        setAddress(dummyLocation.address);
        setCoords(dummyLocation.coords);
        if (!city.trim()) setCity('Lahore');
        if (!area.trim()) setArea('Gulberg III');
        setLocating(false);
    };

    const requestLocation = () => {
        setLocating(true);
        const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
        if (!geo) {
            applyDummyLocation();
            return;
        }
        geo.getCurrentPosition(
            (position) => {
                setUseGps(true);
                setCoords({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
                setAddress(
                    `Current location (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`,
                );
                setLocating(false);
            },
            () => applyDummyLocation(),
            { timeout: 7000, maximumAge: 60_000 },
        );
    };

    const analyze = async () => {
        const next: typeof errors = {};
        if (!city.trim()) next.city = 'Enter the city';
        if (!area.trim()) next.area = 'Enter the area';
        if (!address.trim()) next.address = 'Add an address or use current location';
        setErrors(next);
        if (Object.keys(next).length > 0) return;
        if (!photoUri) {
            Alert.alert('Add a photo of the road damage.');
            return;
        }

        setAnalyzing(true);
        try {
            const result = await detectPotholes(photoUri);
            const detection = await mapYoloToDraft(photoUri, result);
            if (!detection) {
                Alert.alert('No potholes detected.', result.message ?? 'Try another photo of the damaged road.');
                return;
            }
            navigation.navigate('DetectionResult', {
                draft: {
                    photoUri,
                    city: city.trim(),
                    area: area.trim(),
                    roadType,
                    address: address.trim(),
                    coords,
                    description: description.trim() || undefined,
                    landmark: landmark.trim() || undefined,
                    ...detection,
                },
            });
        } catch (error) {
            Alert.alert(
                'Could not analyze the photo',
                error instanceof Error ? error.message : 'Check that the backend is running.',
            );
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <SafeAreaView style={styles.flex} edges={['top']}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    <ScreenContainer>
                        <Text style={styles.heading}>Report a pothole</Text>
                        <Text style={styles.lede}>
                            Add a photo and location. You can stand close — the app will not mark a close-up as Large.
                        </Text>

                        <View style={isWide ? styles.split : undefined}>
                            <View style={[styles.photoBox, isWide && styles.photoBoxWide]}>
                                {photoUri ? (
                                    <>
                                        <Image source={{ uri: photoUri }} style={styles.photo} />
                                        <View style={styles.photoActions}>
                                            <Pressable style={[styles.photoBtn, webCursor]} onPress={() => setSheetOpen(true)}>
                                                <Text style={styles.photoBtnText}>Retake</Text>
                                            </Pressable>
                                            <Pressable
                                                style={[styles.photoBtn, styles.photoBtnGhost, webCursor]}
                                                onPress={() => setPhotoUri(null)}
                                            >
                                                <Text style={styles.photoBtnGhostText}>Remove</Text>
                                            </Pressable>
                                        </View>
                                    </>
                                ) : (
                                    <Pressable
                                        onPress={() => setSheetOpen(true)}
                                        style={[styles.photoEmpty, webCursor]}
                                        accessibilityRole="button"
                                    >
                                        <Ionicons name="camera-outline" size={40} color={colors.tealMid} />
                                        <Text style={styles.photoTitle}>Take photo or choose from gallery</Text>
                                        <Text style={styles.photoHint}>Tap to add a photo</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={isWide ? styles.formCol : undefined}>
                                <TextField
                                    label="City"
                                    placeholder="City or town"
                                    value={city}
                                    onChangeText={(text) => {
                                        setCity(text);
                                        setErrors((prev) => ({ ...prev, city: undefined }));
                                    }}
                                    error={errors.city}
                                    icon="business-outline"
                                    autoCapitalize="words"
                                    autoCorrect
                                />

                                <TextField
                                    label="Area"
                                    placeholder="Neighbourhood, block, or sector"
                                    value={area}
                                    onChangeText={setArea}
                                    error={errors.area}
                                    icon="map-outline"
                                    autoCapitalize="sentences"
                                    autoCorrect
                                />

                                <Text style={styles.section}>Road type</Text>
                                <View style={styles.chips}>
                                    {roadTypes.map((type) => {
                                        const selected = roadType === type;
                                        return (
                                            <Pressable
                                                key={type}
                                                onPress={() => setRoadType(type)}
                                                style={[styles.chip, webCursor, selected && styles.chipSelected]}
                                            >
                                                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                                                    {roadTypeLabels[type]}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Text style={styles.section}>Location</Text>
                                <Pressable
                                    onPress={requestLocation}
                                    style={(state: WebPressableState) => [
                                        styles.gpsRow,
                                        webCursor,
                                        useGps && styles.gpsRowOn,
                                        state.hovered && styles.gpsHover,
                                    ]}
                                >
                                    <Ionicons
                                        name="navigate-outline"
                                        size={20}
                                        color={useGps ? colors.blue : colors.teal}
                                    />
                                    <Text style={styles.gpsLabel}>
                                        {locating ? 'Finding location…' : 'Use Current Location'}
                                    </Text>
                                </Pressable>

                                <TextField
                                    label="Address"
                                    placeholder="Or type the street address manually"
                                    value={address}
                                    onChangeText={(text) => {
                                        setAddress(text);
                                        setUseGps(false);
                                    }}
                                    error={errors.address}
                                    icon="location-outline"
                                    autoCapitalize="sentences"
                                    autoCorrect
                                />
                                <TextField
                                    label="Landmark (optional)"
                                    placeholder="Nearby shop, mosque, or junction"
                                    value={landmark}
                                    onChangeText={setLandmark}
                                    icon="flag-outline"
                                    autoCapitalize="sentences"
                                />
                                <TextField
                                    label="Description (optional)"
                                    placeholder="How bad is the damage? Which lane?"
                                    value={description}
                                    onChangeText={setDescription}
                                    icon="create-outline"
                                    autoCapitalize="sentences"
                                    multiline
                                    numberOfLines={4}
                                />

                                <PrimaryButton title="Analyze photo" onPress={analyze} style={styles.submit} loading={analyzing} />
                                <OutlineButton title="Clear form" onPress={resetForm} style={styles.clear} />
                            </View>
                        </View>
                    </ScreenContainer>
                </ScrollView>

                <Modal
                    visible={sheetOpen}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setSheetOpen(false)}
                >
                    <Pressable style={styles.sheetBackdrop} onPress={() => setSheetOpen(false)}>
                        <Pressable style={styles.sheet} onPress={() => { }}>
                            <View style={styles.handle} />
                            <Pressable style={styles.sheetRow} onPress={() => pick('camera')}>
                                <MaterialIcons name="photo-camera" size={22} color={colors.teal} />
                                <Text style={styles.sheetLabel}>Take photo</Text>
                            </Pressable>
                            <Pressable style={styles.sheetRow} onPress={() => pick('gallery')}>
                                <MaterialIcons name="photo-library" size={22} color={colors.teal} />
                                <Text style={styles.sheetLabel}>Choose from gallery</Text>
                            </Pressable>
                        </Pressable>
                    </Pressable>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: colors.cream,
    },
    scroll: {
        flexGrow: 1,
    },
    split: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 28,
    },
    photoBoxWide: {
        flex: 1,
        height: 360,
        marginBottom: 0,
    },
    formCol: {
        flex: 1,
    },
    gpsHover: {
        borderColor: colors.blueMid,
    },
    heading: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.ink,
    },
    lede: {
        marginTop: 6,
        color: colors.muted,
        lineHeight: 20,
        marginBottom: 18,
    },
    photoBox: {
        height: 210,
        borderRadius: radii.photo,
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: 20,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoEmpty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoTitle: {
        marginTop: 10,
        fontWeight: '700',
        color: colors.ink,
        textAlign: 'center',
        paddingHorizontal: 16,
    },
    photoHint: {
        marginTop: 4,
        color: colors.muted,
    },
    photoActions: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        flexDirection: 'row',
        gap: 8,
    },
    photoBtn: {
        flex: 1,
        backgroundColor: colors.blueMid,
        borderRadius: 10,
        paddingVertical: 8,
        alignItems: 'center',
    },
    photoBtnText: {
        color: colors.white,
        fontWeight: '700',
    },
    photoBtnGhost: {
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    photoBtnGhostText: {
        color: colors.white,
        fontWeight: '700',
    },
    section: {
        fontWeight: '700',
        color: colors.ink,
        fontSize: 15,
        marginBottom: 10,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    chip: {
        backgroundColor: colors.tealLight,
        borderRadius: 24,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    chipSelected: {
        backgroundColor: colors.blueMid,
    },
    chipLabel: {
        fontWeight: '600',
        color: colors.teal,
    },
    chipLabelSelected: {
        color: colors.white,
    },
    gpsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.white,
        borderRadius: radii.button,
        borderWidth: 1,
        borderColor: colors.inputBorder,
        paddingHorizontal: 14,
        paddingVertical: 14,
        marginBottom: 12,
    },
    gpsRowOn: {
        borderColor: colors.blueMid,
        backgroundColor: colors.blueSoft,
    },
    gpsLabel: {
        fontWeight: '700',
        color: colors.ink,
    },
    submit: {
        marginTop: 8,
    },
    clear: {
        marginTop: 10,
    },
    sheetBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
        backgroundColor: colors.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 28,
        paddingTop: 8,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#D5DDDC',
        marginBottom: 8,
    },
    sheetRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 14,
    },
    sheetLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.ink,
    },
});
