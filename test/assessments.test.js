var expect = require('expect.js');
var Assessments;
var mockery = require('mockery');
var assessments;
var dataAdapterMock;


describe('Assessments', function() {
    before(function() {
        mockery.enable({useCleanCache: true});
        mockery.registerAllowable('rsvp');
        mockery.registerAllowable('events');
        mockery.registerAllowable('../src/index.js');
        dataAdapterMock = {};
    });

    after(function() {
        mockery.disable();
    });

    describe('reduceTestResults', function() {
        before(function() {
            mockery.registerMock('mm-platform-matcher', {});
            Assessments = require('../src/index.js');
            assessments = new Assessments(dataAdapterMock);
        });

        after(function() {
            mockery.deregisterMock('mm-platform-matcher');
        });

        it('all FAILURE should give FAILURE', function() {
            expect(assessments.reduceTestResults([
                Assessments.FAILURE,
                Assessments.FAILURE,
                Assessments.FAILURE
                ])
            ).to.be(Assessments.FAILURE);
        });

        it('one FAILURE among PENDINGs and SUCCESSes should give FAILURE', function() {
            expect(assessments.reduceTestResults([
                Assessments.PENDING,
                Assessments.PENDING,
                Assessments.FAILURE,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.SUCCESS,
                Assessments.SUCCESS,
                Assessments.SUCCESS
                ])
            ).to.be(Assessments.FAILURE);
        });

        it('one PENDING and no FAILURE should give PENDING', function() {
            expect(assessments.reduceTestResults([
                Assessments.PENDING,
                Assessments.PENDING,
                Assessments.SUCCESS
                ])
            ).to.be(Assessments.PENDING);
        });

        it('all SUCCESS should give SUCCESS', function() {
            expect(assessments.reduceTestResults([
                Assessments.SUCCESS,
                Assessments.SUCCESS,
                Assessments.SUCCESS
                ])
            ).to.be(Assessments.SUCCESS);
        });

        it('one NO_PLATFORM_MATCHING and all SUCCESSes should give NO_PLATFORM_MATCHING', function() {
            expect(assessments.reduceTestResults([
                Assessments.SUCCESS,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.SUCCESS
                ])
            ).to.be(Assessments.SUCCESS);
        });

        it('one NO_PLATFORM_MATCHING and all PENDINGs should give PENDING', function() {
            expect(assessments.reduceTestResults([
                Assessments.PENDING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.PENDING
                ])
            ).to.be(Assessments.PENDING);
        });

        it('one NO_TEST_MATCHING and all PENDINGs should give PENDING', function() {
            expect(assessments.reduceTestResults([
                Assessments.PENDING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.PENDING
                ])
            ).to.be(Assessments.PENDING);
        });

        it('NO_TEST_MATCHINGs and NO_PLATFORM_MATCHINGs ending with NO_PLATFORM_MATCHING should give NO_PLATFORM_MATCHING', function() {
            expect(assessments.reduceTestResults([
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_PLATFORM_MATCHING
                ])
            ).to.be(Assessments.NO_PLATFORM_MATCHING);
        });

        it('NO_TEST_MATCHINGs and NO_PLATFORM_MATCHINGs ending with NO_TEST_MATCHING should give NO_PLATFORM_MATCHING', function() {
            expect(assessments.reduceTestResults([
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING
                ])
            ).to.be(Assessments.NO_PLATFORM_MATCHING);
        });

        it('NO_TEST_MATCHINGs and NO_PLATFORM_MATCHINGs and a FAILURE should give FAILURE', function() {
            expect(assessments.reduceTestResults([
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.NO_PLATFORM_MATCHING,
                Assessments.FAILURE,
                Assessments.NO_TEST_MATCHING,
                Assessments.NO_PLATFORM_MATCHING
                ])
            ).to.be(Assessments.FAILURE);
        });

        it('one NO_TEST_MATCHING and all SUCCESSes should give NO_TEST_MATCHING', function() {
            expect(assessments.reduceTestResults([
                Assessments.SUCCESS,
                Assessments.NO_TEST_MATCHING,
                Assessments.SUCCESS
                ])
            ).to.be(Assessments.SUCCESS);
        });
    });

    describe('convert', function() {
        before(function() {
            mockery.resetCache();
            mockery.registerMock('mm-platform-matcher', {});
            Assessments = require('../src/index.js');
            assessments = new Assessments(dataAdapterMock);
        });

        after(function() {
            mockery.deregisterMock('mm-platform-matcher');
        });

        it('should convert an empty Array to an empty Array', function() {
            expect(assessments.convert([])).to.eql([]);
        });

        it('should trim spaces', function() {
            expect(assessments.convert(['  a', 'b  ', 'c', '  d  '])).to.eql(['a', 'b', 'c', 'd']);
        });

        it('should convert tags to lower case', function() {
            expect(assessments.convert(['Apple', 'oRaNgE', 'fruit', 'PEACH'])).to.eql(['apple', 'orange', 'fruit', 'peach']);
        });
    });

    describe('matchTags', function() {
        before(function() {
            mockery.resetCache();
            mockery.registerMock('mm-platform-matcher', {});
            Assessments = require('../src/index.js');
            assessments = new Assessments(dataAdapterMock);
        });

        after(function() {
            mockery.deregisterMock('mm-platform-matcher');
        });

        it('should match if all candidates match', function() {
            expect(
                assessments.matchTags(
                    ['apple', 'peach'],
                    ['strawberry', 'blackberry', 'apple', 'peach']
                )
            ).to.be(true);
        });

        it('should not match if no candidate match', function() {
            expect(
                assessments.matchTags(
                    ['peach', 'banana', 'raspberry'],
                    ['strawberry', 'blackberry', 'apple']
                )
            ).to.be(false);
        });

        it('should not match if only some candidates match', function() {
            expect(
                assessments.matchTags(
                    ['apple', 'peach', 'blackberry'],
                    ['strawberry', 'blackberry', 'apple']
                )
            ).to.be(false);
        });

        it('should match if there is no candidate', function() {
            expect(
                assessments.matchTags(
                    [],
                    ['strawberry', 'blackberry', 'apple']
                )
            ).to.be(true);
        });

        it('should not match if there are candidates but no reference', function() {
            expect(
                assessments.matchTags(
                    ['strawberry', 'blackberry', 'apple'],
                    []
                )
            ).to.be(false);
        });

        it('should match if there is no candidate and no reference', function() {
            expect(
                assessments.matchTags(
                    [],
                    []
                )
            ).to.be(true);
        });
    });

    describe('matchTestToAssessment', function() {
        describe('regardless of the platform', function() {
            before(function() {
                mockery.resetCache();
                mockery.registerMock('mm-platform-matcher', {});
                Assessments = require('../src/index.js');
                assessments = new Assessments(dataAdapterMock);
            });

            after(function() {
                mockery.deregisterMock('mm-platform-matcher');
            });

            it('should not match when the test is older than the assessment', function() {
                expect(assessments.matchTestToAssessment(
                    {reportTime: 5,},
                    {id: 6}
                    )).to.be(false);
            });

            it('should not match when no constraint matches the test', function() {
                expect(assessments.matchTestToAssessment(
                    {reportTime: 5, tags: 'strawberries, melon'},
                    {id: 4, definition: [[['apples', 'oranges'], ['platformTag', 'otherPlatformTag']]]}
                    )).to.be(false);
            });
        });

        describe('with a matching platform', function() {
            before(function() {
                mockery.resetCache();
                mockery.registerMock('mm-platform-matcher', {match: function(a, b) {return true;}});
                Assessments = require('../src/index.js');
                assessments = new Assessments(dataAdapterMock);
            });

            after(function() {
                mockery.deregisterMock('mm-platform-matcher');
            });

            it('should match when a constraint matches the test', function() {
                expect(assessments.matchTestToAssessment(
                    {reportTime: 5, tags: 'strawberries, melon'},
                    {id: 4, definition: [
                        [['apples', 'oranges'], ['platformTag', 'otherPlatformTag']],
                        [['strawberries', 'melon'], ['platformTag', 'otherPlatformTag']]
                    ]}
                    )).to.be(true);
            });
        });
        describe('with a non matching platform', function() {
            before(function() {
                mockery.resetCache();
                mockery.registerMock('mm-platform-matcher', {match: function(a, b) {return false;}});
                Assessments = require('../src/index.js');
                assessments = new Assessments(dataAdapterMock);
            });

            after(function() {
                mockery.deregisterMock('mm-platform-matcher');
            });

            it('should not match when a constraint matches the test', function() {
                expect(assessments.matchTestToAssessment(
                    {reportTime: 5, tags: 'strawberries, melon'},
                    {id: 4, definition: [
                        [['apples', 'oranges'], ['platformTag', 'otherPlatformTag']],
                        [['strawberries', 'melon'], ['platformTag', 'otherPlatformTag']]
                    ]}
                    )).to.be(false);
            });
        });
    });
});
