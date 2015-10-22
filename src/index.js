var RSVP = require('rsvp');
var events = require('events');

var platformMatcher = require('mm-platform-matcher');


var assessmentStatuses = {};



function Assessments(dataAdapter) {
    this._dataAdapter = dataAdapter;
    this._events = new events.EventEmitter();
}

Assessments.NO_PLATFORM_MATCHING = 'No platform matching tags';
Assessments.NO_TEST_MATCHING = 'No test matching tags';
Assessments.PENDING = 'Pending';
Assessments.SUCCESS = 'Success';
Assessments.FAILURE = 'Failure';


Assessments.prototype = {
    on: function on(eventName, callback) {
        this._events.on(eventName, callback);
    },

    _getTagsFromTest: function _getTagsFromTest(test) {
        return (
            Object.keys(test)[0]
                .split(',')
                .map(
                    function(test) {
                        return test.trim().toLowerCase();
                    }
                )
        );
    },

    getAssessmentStatus: function getAssessmentStatus(tests, assessmentId) {
        var result = [];

        return RSVP.hash({
            results: this._dataAdapter.get('results'),
            assessmentDefinition: this._dataAdapter.get('assessment/' + assessmentId + '/definition')
        })
            .then(function(hash) {
                tests.forEach(function(test) {
                    var testResultForEachConstraint = this.getTestResultForEachConstraint(
                        hash.assessmentDefinition,
                        this._getTagsFromTest(test),
                        hash.results,
                        assessmentId
                        );
                    result = result.concat(testResultForEachConstraint);
                }.bind(this));

                result = this.reduceTestResults(result);
                return result;
            }.bind(this));
    },

    reduceTestResults: function reduceTestResults(resultArray) {
        return resultArray.reduce(function(element1, element2) {
            if(element1 === Assessments.NO_PLATFORM_MATCHING && element2 === Assessments.NO_TEST_MATCHING) {
                return Assessments.NO_PLATFORM_MATCHING;
            }
            if(element1 === Assessments.NO_TEST_MATCHING || element1 === Assessments.NO_PLATFORM_MATCHING || element1 === null) {
                return element2;
            }
            if(element1 === Assessments.FAILURE || element2 === Assessments.FAILURE) {
                return Assessments.FAILURE;
            }
            if(element1 === Assessments.PENDING || element2 === Assessments.PENDING) {
                return Assessments.PENDING;
            }
            return Assessments.SUCCESS;
        }, null);
    },

    getTestResultForEachConstraint: function getTestResultForEachConstraint(
        assessmentDefinition,
        testTags,
        results,
        assessmentId
    ) {
        return assessmentDefinition.map(function(definition) {
            // check that the test qualifies for this constraint
            var assessmentTestTags = definition[0];
            var assessmentPlatformTags = definition[1].map(function(tag) {return tag.trim();});

            if(this.matchTags(assessmentTestTags, testTags)) {
                if(!platformMatcher.isAKnownPlatform(assessmentPlatformTags)) {
                    return Assessments.NO_PLATFORM_MATCHING;
                }
                // check that it was launched on the right platforms
                var matchingResults = (
                    results
                        .filter(function(result) {
                            return (
                                this.matchTags(
                                    testTags,
                                    result
                                        .tags
                                        .split(',')
                                        .map(function(tag) {return tag.toLowerCase();})
                                ) &&
                                platformMatcher.match(assessmentPlatformTags, result.ua)
                            );
                        }.bind(this))
                        .filter(function(result) {
                            return result.reportTime > assessmentId;
                        })
                );
                if(!matchingResults.length) {
                    return Assessments.PENDING;
                }
                return matchingResults.every(function(result) {return !result.failures;}) ? Assessments.SUCCESS : Assessments.FAILURE;
            }
            return Assessments.NO_TEST_MATCHING;
        }.bind(this));
    },

    convert: function convert(tagList) {
        return tagList.map(function(element) {return element.trim().toLowerCase();});
    },

    matchTags: function matchTags(candidates, reference) {
        candidates = this.convert(candidates);
        reference = this.convert(reference);
        return candidates.every(function(candidate) {
            return reference.indexOf(candidate) !== -1;
        });
    },

    createAssessment: function createAssessment(name, constraints, creationTime) {
        return this._dataAdapter.get('assessments')
            .then(function(assessmentNames) {
                assessmentNames.push(creationTime);
                return this._dataAdapter.set('assessments', assessmentNames);
            }.bind(this))
            .then(function() {
                this._events.emit('assessment_created', creationTime);
                return RSVP.all([
                    this._dataAdapter.set('assessment/' + creationTime + '/name', name),
                    this._dataAdapter.set('assessment/' + creationTime + '/definition', constraints)
                ]);
            }.bind(this));
    },

    getAssessments: function getAssessments() {
        var expectedResults = {};
        var testLib;
        
        return this._dataAdapter.get('tests/library')
            .then(function(testLibrary) {
                testLib = testLibrary;
                return this._dataAdapter.get('assessments');
            }.bind(this))
            .then(function(assessmentIds) {
                return RSVP.all(assessmentIds.map(function(assessmentId) {
                        return RSVP.hash({
                            name: this._dataAdapter.get('assessment/' + assessmentId + '/name'),
                            definition: this._dataAdapter.get('assessment/' + assessmentId + '/definition'),
                            status: this.getAssessmentStatus(testLib, assessmentId)
                        });
                    }.bind(this)))
                    .then(function(assessments) {
                        return assessments.map(function(assessment, index) {
                            return {
                                name: assessment.name,
                                status: assessment.status,
                                definition: assessment.definition,
                                id: assessmentIds[index]
                            };
                        });
                    }.bind(this));
            }.bind(this));
    },

    getDataAdapter: function getDataAdapter() {
        return this._dataAdapter;
    },

    matchTestToAssessment: function matchTestToAssessment(test, assessment) {
        return (
            test.reportTime > assessment.id &&
            assessment.definition.some(function(constraint) {
                return this.matchTags(
                    constraint[0],
                    test.tags.split(',').map(function(tag) {return tag.trim().toLowerCase();})) &&
                platformMatcher.match(constraint[1], test.ua);
            }.bind(this))
        );
    }
};


module.exports = Assessments;
