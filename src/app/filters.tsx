import { useState } from 'react';
import { Text, View, ScrollView, Pressable, TextInput } from 'react-native';
import { X, Search, ChevronUp, ChevronDown, Check } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useSakeList } from '@/lib/supabase-hooks';

type SakeType = 'Junmai' | 'Daiginjo' | 'Ginjo' | 'Honjozo' | 'Nigori';
type Region = 'Niigata' | 'Kyoto (Fushimi)' | 'Hyogo (Nada)' | 'Yamaguchi' | 'Yamagata';
type RiceType = 'Yamada Nishiki' | 'Omachi' | 'Gohyakumangoku';

const SAKE_TYPES: SakeType[] = ['Junmai', 'Daiginjo', 'Ginjo', 'Honjozo', 'Nigori'];
const REGIONS: Region[] = ['Niigata', 'Kyoto (Fushimi)', 'Hyogo (Nada)', 'Yamaguchi', 'Yamagata'];
const RICE_TYPES: RiceType[] = ['Yamada Nishiki', 'Omachi', 'Gohyakumangoku'];

export default function FiltersScreen() {
  const insets = useSafeAreaInsets();

  // Get actual sake count from Supabase
  const { data: sakeData } = useSakeList({ limit: 100 });
  const totalSakeCount = sakeData?.count ?? sakeData?.data?.length ?? 0;

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<SakeType[]>(['Junmai']);
  const [selectedRegions, setSelectedRegions] = useState<Region[]>(['Niigata']);
  const [selectedRiceTypes, setSelectedRiceTypes] = useState<RiceType[]>([]);
  const [priceMin, setPriceMin] = useState(25);
  const [priceMax, setPriceMax] = useState(85);
  const [smvValue, setSmvValue] = useState(2.5);
  const [polishingRatio, setPolishingRatio] = useState(45);

  // Section collapse state
  const [typeExpanded, setTypeExpanded] = useState(true);
  const [regionExpanded, setRegionExpanded] = useState(true);
  const [riceTypeExpanded, setRiceTypeExpanded] = useState(true);

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleReset = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearchQuery('');
    setSelectedTypes([]);
    setSelectedRegions([]);
    setSelectedRiceTypes([]);
    setPriceMin(25);
    setPriceMax(85);
    setSmvValue(0);
    setPolishingRatio(50);
  };

  const toggleType = async (type: SakeType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleRegion = async (region: Region) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRegions(prev =>
      prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
    );
  };

  const toggleRiceType = async (riceType: RiceType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRiceTypes(prev =>
      prev.includes(riceType) ? prev.filter(r => r !== riceType) : [...prev, riceType]
    );
  };

  const handleShowResults = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to search results with filters
    router.replace({
      pathname: '/search-results',
      params: {
        query: searchQuery,
        types: selectedTypes.join(','),
        regions: selectedRegions.join(','),
        smv: smvValue.toString(),
        polishingRatio: polishingRatio.toString(),
      },
    });
  };

  // Result count based on Supabase data
  const resultCount = totalSakeCount;

  return (
    <View className="flex-1 bg-[#FAFAF8]" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-[#E8E4D9]">
        <Pressable onPress={handleClose} className="w-10 h-10 items-center justify-center">
          <X size={24} color="#1a1a1a" />
        </Pressable>
        <Text className="text-lg font-semibold text-[#1a1a1a]">Advanced Filters</Text>
        <Pressable onPress={handleReset}>
          <Text className="text-[#C9A227] font-medium">Reset</Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Search Bar */}
        <View className="px-5 pt-4 pb-2">
          <View
            className="flex-row items-center px-4 py-3 rounded-xl"
            style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E8E4D9' }}
          >
            <Search size={18} color="#8B8B8B" />
            <TextInput
              className="flex-1 ml-3 text-base text-[#1a1a1a]"
              placeholder="Search by name or keyword"
              placeholderTextColor="#8B8B8B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Type Section */}
        <View className="px-5 py-4">
          <Pressable
            onPress={() => setTypeExpanded(!typeExpanded)}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-xl font-bold text-[#1a1a1a]">Type</Text>
            {typeExpanded ? (
              <ChevronUp size={20} color="#8B8B8B" />
            ) : (
              <ChevronDown size={20} color="#8B8B8B" />
            )}
          </Pressable>

          {typeExpanded && (
            <View className="flex-row flex-wrap gap-2">
              {SAKE_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => toggleType(type)}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: selectedTypes.includes(type) ? '#C9A227' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: selectedTypes.includes(type) ? '#C9A227' : '#E8E4D9',
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: selectedTypes.includes(type) ? '#FFFFFF' : '#1a1a1a' }}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Region Section */}
        <View className="px-5 py-4 border-t border-[#F0EDE5]">
          <Pressable
            onPress={() => setRegionExpanded(!regionExpanded)}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-xl font-bold text-[#1a1a1a]">Region</Text>
            {regionExpanded ? (
              <ChevronUp size={20} color="#8B8B8B" />
            ) : (
              <ChevronDown size={20} color="#8B8B8B" />
            )}
          </Pressable>

          {regionExpanded && (
            <View>
              {REGIONS.map((region) => (
                <Pressable
                  key={region}
                  onPress={() => toggleRegion(region)}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className="text-base text-[#1a1a1a]">{region}</Text>
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: selectedRegions.includes(region) ? '#C9A227' : 'transparent',
                      borderWidth: selectedRegions.includes(region) ? 0 : 2,
                      borderColor: '#E8E4D9',
                    }}
                  >
                    {selectedRegions.includes(region) && (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Rice Type Section */}
        <View className="px-5 py-4 border-t border-[#F0EDE5]">
          <Pressable
            onPress={() => setRiceTypeExpanded(!riceTypeExpanded)}
            className="flex-row items-center justify-between mb-3"
          >
            <Text className="text-xl font-bold text-[#1a1a1a]">Rice Type</Text>
            {riceTypeExpanded ? (
              <ChevronUp size={20} color="#8B8B8B" />
            ) : (
              <ChevronDown size={20} color="#8B8B8B" />
            )}
          </Pressable>

          {riceTypeExpanded && (
            <View className="flex-row flex-wrap gap-2">
              {RICE_TYPES.map((riceType) => (
                <Pressable
                  key={riceType}
                  onPress={() => toggleRiceType(riceType)}
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: selectedRiceTypes.includes(riceType) ? '#C9A227' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: selectedRiceTypes.includes(riceType) ? '#C9A227' : '#E8E4D9',
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: selectedRiceTypes.includes(riceType) ? '#FFFFFF' : '#1a1a1a' }}
                  >
                    {riceType}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Price Range Section */}
        <View className="px-5 py-4 border-t border-[#F0EDE5]">
          <Text className="text-xl font-bold text-[#1a1a1a] mb-4">Price Range</Text>

          <SliderTrack
            minValue={0}
            maxValue={150}
            lowValue={priceMin}
            highValue={priceMax}
            onLowChange={setPriceMin}
            onHighChange={setPriceMax}
          />

          <View className="flex-row justify-between mt-4">
            <View
              className="px-4 py-2 rounded-lg"
              style={{ borderWidth: 1, borderColor: '#E8E4D9' }}
            >
              <Text className="text-xs text-[#8B8B8B]">Min</Text>
              <Text className="text-lg font-bold text-[#1a1a1a]">${priceMin}</Text>
            </View>
            <View
              className="px-4 py-2 rounded-lg"
              style={{ borderWidth: 1, borderColor: '#E8E4D9' }}
            >
              <Text className="text-xs text-[#8B8B8B]">Max</Text>
              <Text className="text-lg font-bold text-[#1a1a1a]">${priceMax}</Text>
            </View>
          </View>
        </View>

        {/* Technical Specs Section */}
        <View className="px-5 py-4 border-t border-[#F0EDE5]">
          <Text className="text-xl font-bold text-[#1a1a1a] mb-6">Technical Specs</Text>

          {/* SMV Slider */}
          <View className="mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-base font-medium text-[#1a1a1a]">SMV (Sake Meter Value)</Text>
              <Text className="text-base font-bold text-[#C9A227]">
                {smvValue >= 0 ? '+' : ''}{smvValue.toFixed(1)}
              </Text>
            </View>

            <SingleSlider
              minValue={-10}
              maxValue={10}
              value={smvValue}
              onChange={setSmvValue}
            />

            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-[#8B8B8B]">SWEET (-10)</Text>
              <Text className="text-xs text-[#8B8B8B]">NEUTRAL (0)</Text>
              <Text className="text-xs text-[#8B8B8B]">DRY (+10)</Text>
            </View>
          </View>

          {/* Rice Polishing Ratio Slider */}
          <View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-base font-medium text-[#1a1a1a]">Rice Polishing Ratio</Text>
              <Text className="text-base font-bold text-[#C9A227]">{polishingRatio}%</Text>
            </View>

            <SingleSlider
              minValue={10}
              maxValue={90}
              value={polishingRatio}
              onChange={setPolishingRatio}
            />

            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-[#8B8B8B]">HIGH POLISH (10%)</Text>
              <Text className="text-xs text-[#8B8B8B]">LOW POLISH (90%)</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Buttons */}
      <View
        className="absolute bottom-0 left-0 right-0 flex-row px-5 py-4 bg-[#FAFAF8] border-t border-[#E8E4D9]"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Pressable onPress={handleReset} className="flex-1 items-center justify-center py-4">
          <Text className="text-[#1a1a1a] font-medium text-base">Reset</Text>
        </Pressable>

        <Pressable
          onPress={handleShowResults}
          className="flex-2 ml-3 items-center justify-center py-4 rounded-full"
          style={{ backgroundColor: '#1a1a1a', flex: 2 }}
        >
          <Text className="text-white font-semibold text-base">
            Show {resultCount} Results
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// Simple single value slider
function SingleSlider({
  minValue,
  maxValue,
  value,
}: {
  minValue: number;
  maxValue: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

  return (
    <View className="h-6 justify-center">
      {/* Track */}
      <View className="h-1 bg-[#E8E4D9] rounded-full">
        <View
          className="h-1 bg-[#C9A227] rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </View>
      {/* Thumb */}
      <Pressable
        className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#C9A227]"
        style={{
          left: `${percentage}%`,
          marginLeft: -12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
    </View>
  );
}

// Dual thumb slider for price range
function SliderTrack({
  minValue,
  maxValue,
  lowValue,
  highValue,
  onLowChange,
  onHighChange,
}: {
  minValue: number;
  maxValue: number;
  lowValue: number;
  highValue: number;
  onLowChange: (value: number) => void;
  onHighChange: (value: number) => void;
}) {
  const lowPercentage = ((lowValue - minValue) / (maxValue - minValue)) * 100;
  const highPercentage = ((highValue - minValue) / (maxValue - minValue)) * 100;

  return (
    <View className="h-6 justify-center">
      {/* Track */}
      <View className="h-1 bg-[#E8E4D9] rounded-full">
        <View
          className="h-1 bg-[#C9A227] rounded-full absolute"
          style={{
            left: `${lowPercentage}%`,
            right: `${100 - highPercentage}%`,
          }}
        />
      </View>
      {/* Low Thumb */}
      <Pressable
        className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#C9A227]"
        style={{
          left: `${lowPercentage}%`,
          marginLeft: -12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
      {/* High Thumb */}
      <Pressable
        className="absolute w-6 h-6 rounded-full bg-white border-2 border-[#C9A227]"
        style={{
          left: `${highPercentage}%`,
          marginLeft: -12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      />
    </View>
  );
}
