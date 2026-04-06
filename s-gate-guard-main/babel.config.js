module.exports = function (api) {
    const isTest = api.env('test');
    api.cache(!isTest);
    return {
        presets: [
            'babel-preset-expo',
            ...(isTest ? [] : ['nativewind/babel']),
        ],
        plugins: [
            'react-native-reanimated/plugin',
        ],
    };
};
