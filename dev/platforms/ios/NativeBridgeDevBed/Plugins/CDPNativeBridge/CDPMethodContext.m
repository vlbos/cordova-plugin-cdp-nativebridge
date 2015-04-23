/**
 * @file CDPMethodContext.m
 * @brief Implementation file for CDP NativeBridge Gate Context class.
 */

#import "CDPMethodContext.h"

@implementation CDPMethodContext {
    NSString* _objectId;
    NSString* _taskId;
    BOOL _compatible;
    NSString* _threadId;
    BOOL _needSendResult;
}

/**
 * initializer
 *
 * @param plugin    [in] plugin instance
 * @param command   [in] command object
 * @param execInfo  [in] execute information object
 * @param arguments [in] arguments array
 */
- (id)initWithPlugin:(const CDVPlugin*)plugin
          andCommand:(const CDVInvokedUrlCommand*)command
         andExecInfo:(const NSDictionary*)execInfo
       andArguments:(NSArray*)arguments
{
    self = [super initWithArguments:arguments
                         callbackId:command.callbackId
                          className:execInfo[@"feature"][@"ios"][@"packageInfo"]
                         methodName:execInfo[@"method"] ? execInfo[@"method"] : nil];
    if (self) {
        self.commandDelegate = plugin.commandDelegate;
        _objectId = execInfo[@"objectId"];
        _taskId = execInfo[@"taskId"] ? execInfo[@"taskId"] : nil;
        _compatible = execInfo[@"compatible"] ? [execInfo[@"compatible"] boolValue] : NO;
        _threadId = [NSString stringWithFormat:@"%@", [NSThread currentThread]];
        _needSendResult = YES;
    }
    return self;
}

@end
