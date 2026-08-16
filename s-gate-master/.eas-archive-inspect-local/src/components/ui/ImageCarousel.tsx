import { useState } from 'react';
import { FlatList, Image, LayoutChangeEvent, Text, View } from 'react-native';

interface ImageCarouselProps {
    images: string[];
    height?: number;
    resizeMode?: 'cover' | 'contain';
}

export function ImageCarousel({ images, height = 256, resizeMode = 'cover' }: ImageCarouselProps) {
    const [width, setWidth] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!images || images.length === 0) return null;

    const onLayout = (e: LayoutChangeEvent) => {
        setWidth(e.nativeEvent.layout.width);
    };

    const handleScroll = (event: any) => {
        if (width > 0) {
            const contentOffset = event.nativeEvent.contentOffset.x;
            const index = Math.round(contentOffset / width);
            setCurrentIndex(index);
        }
    };

    if (images.length === 1) {
        return (
            <View className="w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800" style={{ height }}>
                <Image
                    source={{ uri: images[0] }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode={resizeMode}
                />
            </View>
        );
    }

    return (
        <View 
            className="w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800 relative" 
            style={{ height }}
            onLayout={onLayout}
        >
            {width > 0 && (
                <FlatList
                    data={images}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item }) => (
                        <View style={{ width, height }}>
                            <Image
                                source={{ uri: item }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode={resizeMode}
                            />
                        </View>
                    )}
                />
            )}

            {/* Pagination Indicator */}
            <View className="absolute bottom-3 right-3 bg-black/50 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">
                    {currentIndex + 1} / {images.length}
                </Text>
            </View>
        </View>
    );
}
