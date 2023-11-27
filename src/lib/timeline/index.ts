import TimelineInitialMessage from './TimelineInitialMessage';

export interface TimelineEntry<T = object> {
    id: string
    timeline: string
    created: Date
    signature: string
    message: T
    timelinePrev?: string
    thread?: string
    threadPrev?: string
    lastEntryId?: string
    trackingId?: string
}

export interface InitialTimelineEntry extends TimelineEntry<TimelineInitialMessage> {
}